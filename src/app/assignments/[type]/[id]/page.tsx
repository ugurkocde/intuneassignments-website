"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "~/config/authConfig";
import { useIntunePolicies, useLoadingState } from "~/hooks/useIntuneData";
import { LoadingCard } from "~/components/ui/loading-card";
import { Card, CardContent } from "~/components/ui/card";
import { PoliciesTable } from "~/components/dashboard/policies-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import {
  Users,
  User,
  Monitor,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Columns2,
} from "lucide-react";
import type { PolicyData } from "~/types/graph";
import { useParams } from "next/navigation";
import {
  fetchGroup,
  getDevice,
  getDeviceGroups,
  getUser,
  getUserGroups,
} from "~/services/graph";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";
import Link from "next/link";

type AssignmentType = "group" | "user" | "device";

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(blob);
  });

const uniqById = (items: PolicyData[]) => {
  const seen = new Set<string>();
  const out: PolicyData[] = [];
  for (const p of items) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
};

export default function AssignmentsPage({
}: {
  params: { type: string; id: string };
}) {
  // In client components, `params` can be unreliable depending on Next runtime.
  // `useParams()` is the most reliable source of dynamic segments here.
  const routeParams = useParams();
  const rawType = routeParams?.type;
  const rawId = routeParams?.id;

  const type = (Array.isArray(rawType) ? rawType[0] : rawType) as AssignmentType;
  const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;

  const { instance, accounts } = useMsal();
  const { data: policies, isLoading, error } = useIntunePolicies();
  const loadingState = useLoadingState();

  const [subjectTitle, setSubjectTitle] = useState<string>(id);
  const [subjectSubtitle, setSubjectSubtitle] = useState<string>("");
  const [membershipGroupIds, setMembershipGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [membershipGroupNames, setMembershipGroupNames] = useState<string[]>([]);
  const [membershipGroupCount, setMembershipGroupCount] = useState<number>(0);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string>("");
  const [showMemberships, setShowMemberships] = useState(false);
  const [membershipSearch, setMembershipSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [accounts, instance]);

  useEffect(() => {
    let cancelled = false;
    setResolveError("");

    const run = async () => {
      if (!accounts[0]) return;

      setIsResolving(true);
      try {
        const token = await getAccessToken();

        if (type === "group") {
          const displayName = await fetchGroup(token, id);
          if (!cancelled) {
            setSubjectTitle(displayName);
            setSubjectSubtitle(id);
            setMembershipGroupIds(new Set());
            setMembershipGroupNames([]);
            setMembershipGroupCount(0);
            setShowMemberships(false);
            setMembershipSearch("");
            setProfileImageUrl(null);
          }
          return;
        }

        if (type === "user") {
          const user = await getUser(token, id);
          const groups = await getUserGroups(token, id);
          const ids = new Set(groups.map((g) => g.id));
          const names = groups
            .map((g) => g.displayName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

          // Best-effort profile photo fetch (404 means no photo)
          let photoDataUrl: string | null = null;
          try {
            const res = await fetch(
              `https://graph.microsoft.com/v1.0/users/${id}/photo/$value`,
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            if (res.ok) {
              const blob = await res.blob();
              photoDataUrl = await blobToDataUrl(blob);
            }
          } catch {
            // ignore
          }

          if (!cancelled) {
            setSubjectTitle(user?.displayName ?? id);
            setSubjectSubtitle(user?.mail ?? user?.userPrincipalName ?? id);
            setMembershipGroupIds(ids);
            setMembershipGroupNames(names);
            setMembershipGroupCount(groups.length);
            setProfileImageUrl(photoDataUrl);
          }
          return;
        }

        if (type === "device") {
          const device = await getDevice(token, id);
          const groups = await getDeviceGroups(token, id);
          const ids = new Set(groups.map((g) => g.id));
          const names = groups
            .map((g) => g.displayName)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
          if (!cancelled) {
            setSubjectTitle(device?.displayName ?? id);
            setSubjectSubtitle(
              device?.serialNumber
                ? `${device.operatingSystem ?? "Unknown OS"} | SN: ${device.serialNumber}`
                : device?.operatingSystem ?? id,
            );
            setMembershipGroupIds(ids);
            setMembershipGroupNames(names);
            setMembershipGroupCount(groups.length);
            setProfileImageUrl(null);
          }
          return;
        }

        if (!cancelled) {
          setResolveError("Unknown assignment type.");
        }
      } catch (e: any) {
        if (!cancelled) {
          setResolveError(e?.message ?? "Failed to resolve entity details.");
        }
      } finally {
        if (!cancelled) setIsResolving(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accounts, getAccessToken, id, type]);

  const allPolicies = policies ?? [];

  const groupView = useMemo(() => {
    if (type !== "group") return null;
    const assigned = allPolicies.filter((p) => p.assignedGroupIds.includes(id));
    const excluded = allPolicies.filter((p) => p.excludedGroupIds.includes(id));
    const all = uniqById([...assigned, ...excluded]);
    return { assigned, excluded, all };
  }, [allPolicies, id, type]);

  const principalView = useMemo(() => {
    if (type === "group") return null;
    if (membershipGroupIds.size === 0) {
      // still allow All Users / All Devices matches
    }

    const isUser = type === "user";
    const allTargetStatus: PolicyData["assignmentStatus"] = isUser
      ? "All Users"
      : "All Devices";

    const matchedViaAllTarget = new Set<string>();
    const matchedViaGroups = new Set<string>();
    const matchedViaExclusions = new Set<string>();

    const candidate = allPolicies.filter((p) => {
      const viaAll = p.assignmentStatus === allTargetStatus;
      const viaGroup = p.assignedGroupIds.some((gid) => membershipGroupIds.has(gid));
      if (viaAll) matchedViaAllTarget.add(p.id);
      if (viaGroup) matchedViaGroups.add(p.id);
      return viaAll || viaGroup;
    });

    const excluded = allPolicies.filter((p) =>
      p.excludedGroupIds.some((gid) => membershipGroupIds.has(gid)),
    );
    excluded.forEach((p) => matchedViaExclusions.add(p.id));

    const excludedIdSet = new Set(excluded.map((p) => p.id));
    const effective = candidate.filter((p) => !excludedIdSet.has(p.id));

    const all = uniqById([...candidate, ...excluded]);

    return {
      effective,
      excluded,
      all,
      counts: {
        viaAllTarget: matchedViaAllTarget.size,
        viaGroups: matchedViaGroups.size,
        excluded: matchedViaExclusions.size,
      },
    };
  }, [allPolicies, membershipGroupIds, type]);

  const icon = type === "group" ? Users : type === "user" ? User : Monitor;
  const Icon = icon;

  const filteredMembershipNames = useMemo(() => {
    const q = membershipSearch.trim().toLowerCase();
    if (!q) return membershipGroupNames;
    return membershipGroupNames.filter((n) => n.toLowerCase().includes(q));
  }, [membershipGroupNames, membershipSearch]);

  const copyMemberships = useCallback(async () => {
    try {
      const text = membershipGroupNames.join("\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }, [membershipGroupNames]);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center p-4 sm:p-6 bg-background">
        <LoadingCard
          stage={loadingState.stage}
          progress={loadingState.progress}
          details={loadingState.details}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-background">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 glass-card dark:glass-card-dark">
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <div className="text-red-500 font-semibold text-lg">
              Error Loading Data
            </div>
            <div className="text-sm text-muted-foreground">{error.message}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type !== "group" && type !== "user" && type !== "device") {
    return (
      <div className="flex items-center justify-center p-4 bg-background">
        <Card className="glass-card dark:glass-card-dark">
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <div className="font-semibold text-lg">Invalid assignment type</div>
            <div className="text-sm text-muted-foreground">
              Expected one of: group, user, device
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showGroup = type === "group" && groupView;
  const showPrincipal = type !== "group" && principalView;

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            {type === "user" && profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt={subjectTitle}
                className="h-full w-full object-cover"
              />
            ) : (
              <Icon className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {subjectTitle}
            </h1>
            {subjectSubtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subjectSubtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="outline" className="capitalize">
            {type}
          </Badge>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href={`/compare?items=${type}:${id}`}>
              <Columns2 className="h-4 w-4" />
              Compare
            </Link>
          </Button>
          {type !== "group" && (
            <Badge variant="outline">
              {membershipGroupCount} group membership
              {membershipGroupCount === 1 ? "" : "s"}
            </Badge>
          )}
          {type !== "group" && showPrincipal && (
            <>
              <Badge variant="outline">
                All {type === "user" ? "Users" : "Devices"}:{" "}
                {showPrincipal.counts.viaAllTarget}
              </Badge>
              <Badge variant="outline">
                Group assignments: {showPrincipal.counts.viaGroups}
              </Badge>
              <Badge variant="outline">
                Exclusions: {showPrincipal.counts.excluded}
              </Badge>
            </>
          )}
          {isResolving && (
            <Badge variant="outline" className="gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Resolving…
            </Badge>
          )}
          {resolveError && (
            <Badge
              variant="outline"
              className="gap-2 border-red-500/40 text-red-600"
            >
              <AlertCircle className="h-3.5 w-3.5" />
              {resolveError}
            </Badge>
          )}
        </div>
      </div>

      {type !== "group" && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMemberships((v) => !v)}
            className="gap-2"
          >
            {showMemberships ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Memberships ({membershipGroupCount})
          </Button>

          {showMemberships && (
            <Card className="glass-card dark:glass-card-dark">
              <CardContent className="pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <Input
                      value={membershipSearch}
                      onChange={(e) => setMembershipSearch(e.target.value)}
                      placeholder="Filter memberships..."
                      className="bg-background/50"
                      aria-label="Filter group memberships"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyMemberships}
                    disabled={membershipGroupNames.length === 0}
                    className="gap-2"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div
                  className={cn(
                    "mt-3 max-h-[240px] overflow-y-auto rounded-lg border border-border bg-background/40",
                    "px-3 py-2",
                  )}
                >
                  {filteredMembershipNames.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No memberships match your filter.
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {filteredMembershipNames.map((name) => (
                        <li
                          key={name}
                          className="text-sm text-foreground/90 truncate"
                          title={name}
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Showing transitive memberships (includes nested groups).
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {showGroup && (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="inline-flex h-auto w-auto p-1 bg-muted/50 backdrop-blur-sm glass-surface">
            <TabsTrigger value="all" className="rounded-sm">
              All ({showGroup.all.length})
            </TabsTrigger>
            <TabsTrigger value="assigned" className="rounded-sm">
              Assigned ({showGroup.assigned.length})
            </TabsTrigger>
            <TabsTrigger value="excluded" className="rounded-sm">
              Excluded ({showGroup.excluded.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="all">
              <PoliciesTable policies={showGroup.all} getAccessToken={getAccessToken} />
            </TabsContent>
            <TabsContent value="assigned">
              <PoliciesTable
                policies={showGroup.assigned}
                getAccessToken={getAccessToken}
              />
            </TabsContent>
            <TabsContent value="excluded">
              <p className="mb-3 text-sm text-muted-foreground">
                Excluded policies are those where this group is targeted as an exclusion.
              </p>
              <PoliciesTable
                policies={showGroup.excluded}
                getAccessToken={getAccessToken}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}

      {showPrincipal && (
        <Tabs defaultValue="effective" className="w-full">
          <TabsList className="inline-flex h-auto w-auto p-1 bg-muted/50 backdrop-blur-sm glass-surface">
            <TabsTrigger value="effective" className="rounded-sm">
              Effective ({showPrincipal.effective.length})
            </TabsTrigger>
            <TabsTrigger value="excluded" className="rounded-sm">
              Excluded ({showPrincipal.excluded.length})
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-sm">
              All matched ({showPrincipal.all.length})
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="effective">
              <PoliciesTable
                policies={showPrincipal.effective}
                getAccessToken={getAccessToken}
              />
            </TabsContent>
            <TabsContent value="excluded">
              <p className="mb-3 text-sm text-muted-foreground">
                Excluded policies are those targeted by at least one exclusion group the{" "}
                {type} is a member of.
              </p>
              <PoliciesTable
                policies={showPrincipal.excluded}
                getAccessToken={getAccessToken}
              />
            </TabsContent>
            <TabsContent value="all">
              <p className="mb-3 text-sm text-muted-foreground">
                All matched includes policies targeted to All{" "}
                {type === "user" ? "Users" : "Devices"} and group assignments, plus any
                policies excluded by group membership.
              </p>
              <PoliciesTable
                policies={showPrincipal.all}
                getAccessToken={getAccessToken}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}


