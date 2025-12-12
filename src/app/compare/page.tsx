"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useRouter, useSearchParams } from "next/navigation";
import { loginRequest } from "~/config/authConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardContent } from "~/components/ui/card";
import { VSComparePicker } from "~/components/compare/vs-compare-picker";
import { CompareTable, type CompareRow } from "~/components/compare/compare-table";
import { useIntunePolicies, useLoadingState } from "~/hooks/useIntuneData";
import { LoadingCard } from "~/components/ui/loading-card";
import type { CompareSubject } from "~/types/compare";
import { subjectKey } from "~/types/compare";
import { fetchGroup, getDevice, getUser } from "~/services/graph";
import type { PolicyData } from "~/types/graph";
import { useCompareAssignments } from "~/hooks/useCompareAssignments";
import { useCompareSettingsDiff } from "~/hooks/useCompareSettingsDiff";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";

type ParsedRef = { type: CompareSubject["type"]; id: string };

const parseItemsParam = (items: string | null): ParsedRef[] => {
  if (!items) return [];
  return items
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [type, id] = part.split(":");
      if (!type || !id) return null;
      if (type !== "user" && type !== "device" && type !== "group") return null;
      return { type, id } as ParsedRef;
    })
    .filter(Boolean) as ParsedRef[];
};

const serializeItemsParam = (subjects: CompareSubject[]) =>
  subjects.map((s) => `${s.type}:${s.id}`).join(",");

export default function ComparePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { instance, accounts } = useMsal();

  const { data: policies, isLoading, error } = useIntunePolicies();
  const loadingState = useLoadingState();

  const [subjects, setSubjects] = useState<[CompareSubject | null, CompareSubject | null]>([null, null]);
  const [isHydratingFromUrl, setIsHydratingFromUrl] = useState(false);
  const [hydrationError, setHydrationError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"policies" | "apps" | "settings">(
    "policies",
  );

  // Track if we initiated the URL change to prevent re-hydration loops
  const isUpdatingUrl = useRef(false);

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [accounts, instance]);

  // Hydrate initial selection from URL (?items=user:ID,device:ID)
  useEffect(() => {
    // Skip if we're the source of the URL change
    if (isUpdatingUrl.current) {
      isUpdatingUrl.current = false;
      return;
    }

    let cancelled = false;
    const items = searchParams.get("items");
    const parsed = parseItemsParam(items).slice(0, 2); // Only take first 2 items
    if (parsed.length === 0) return;

    // If we already have the same selection, do nothing.
    const currentSubjects = subjects.filter((s): s is CompareSubject => s !== null);
    const currentKeys = new Set(currentSubjects.map(subjectKey));
    const parsedKeys = new Set(parsed.map((p) => `${p.type}:${p.id}`));
    const identical =
      currentKeys.size === parsedKeys.size &&
      [...parsedKeys].every((k) => currentKeys.has(k));
    if (identical) return;

    if (!accounts[0]) return;

    setIsHydratingFromUrl(true);
    setHydrationError("");

    const run = async () => {
      try {
        const token = await getAccessToken();
        const resolved: CompareSubject[] = [];

        for (const ref of parsed) {
          if (ref.type === "user") {
            const u = await getUser(token, ref.id);
            if (u) {
              resolved.push({
                type: "user",
                id: u.id,
                label: u.displayName,
                subtitle: u.mail ?? u.userPrincipalName,
              });
            }
          } else if (ref.type === "device") {
            const d = await getDevice(token, ref.id);
            if (d) {
              resolved.push({
                type: "device",
                id: d.id,
                label: d.displayName,
                subtitle: d.serialNumber
                  ? `${d.operatingSystem ?? "Unknown OS"} | SN: ${d.serialNumber}`
                  : d.operatingSystem ?? "Device",
              });
            }
          } else {
            const name = await fetchGroup(token, ref.id);
            resolved.push({
              type: "group",
              id: ref.id,
              label: name ?? ref.id,
              subtitle: ref.id,
            });
          }
        }

        if (!cancelled) {
          // Map to tuple format
          setSubjects([resolved[0] ?? null, resolved[1] ?? null]);
        }
      } catch (e: any) {
        if (!cancelled) setHydrationError(e?.message ?? "Failed to load items from URL");
      } finally {
        if (!cancelled) setIsHydratingFromUrl(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, getAccessToken, searchParams]);

  const onSubjectsChange = useCallback(
    (next: [CompareSubject | null, CompareSubject | null]) => {
      setSubjects(next);
      const valid = next.filter((s): s is CompareSubject => s !== null);
      const params = new URLSearchParams(searchParams.toString());
      if (valid.length === 0) params.delete("items");
      else params.set("items", serializeItemsParam(valid));
      // Mark that we're updating the URL to prevent re-hydration
      isUpdatingUrl.current = true;
      router.replace(`/compare?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Convert tuple to array for hooks that expect CompareSubject[]
  const subjectsArray = useMemo(
    () => subjects.filter((s): s is CompareSubject => s !== null),
    [subjects]
  );

  const allPolicies = policies ?? [];

  const {
    loading: compareLoading,
    error: compareError,
    computed,
  } = useCompareAssignments({
    subjects: subjectsArray,
    policies: allPolicies,
    getAccessToken,
  });

  const compareRows = useMemo(() => {
    if (subjectsArray.length === 0) return { policies: [] as CompareRow[], apps: [] as CompareRow[] };
    const policyById = new Map<string, PolicyData>();
    for (const p of allPolicies) policyById.set(p.id, p);

    const union = new Map<string, { policy: PolicyData; perSubject: Record<string, any> }>();

    for (const s of subjectsArray) {
      const k = subjectKey(s);
      const presences = computed.perSubject[k] ?? new Map<string, any>();
      for (const [policyId, presence] of presences.entries()) {
        const p = policyById.get(policyId);
        if (!p) continue;
        if (!union.has(p.id)) {
          union.set(p.id, { policy: p, perSubject: {} });
        }
        const entry = union.get(p.id)!;
        entry.perSubject[k] = {
          present: true,
          excluded: presence.excluded,
          reasons: presence.reasons,
          filters: presence.filters,
        };
      }
    }

    const rows: CompareRow[] = [...union.values()].map((v) => ({
      id: v.policy.id,
      name: v.policy.name,
      type: v.policy.type,
      platform: v.policy.platform,
      perSubject: v.perSubject,
    }));

    return {
      policies: rows.filter((r) => r.type !== "Application"),
      apps: rows.filter((r) => r.type === "Application"),
    };
  }, [allPolicies, computed.perSubject, subjectsArray]);

  const settingsDiff = useCompareSettingsDiff({
    enabled: activeTab === "settings" && subjectsArray.length >= 2,
    subjects: subjectsArray,
    policies: allPolicies,
    effectivePolicyIdsBySubject: computed.effectivePolicyIdsBySubject,
    getAccessToken,
  });

  if (isLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center p-4 sm:p-6 bg-background">
        <LoadingCard stage={loadingState.stage} progress={loadingState.progress} details={loadingState.details} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-background">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 glass-card dark:glass-card-dark">
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <div className="text-red-500 font-semibold text-lg">Error Loading Data</div>
            <div className="text-sm text-muted-foreground">{error.message}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-sm text-muted-foreground">
          Compare assignments across multiple users, devices, and groups.
        </p>
      </div>

      <Card className="glass-card dark:glass-card-dark">
        <CardContent className="pt-6 space-y-4">
          <VSComparePicker value={subjects} onChange={onSubjectsChange} />
          {hydrationError ? (
            <div className="text-sm text-red-600 dark:text-red-400">{hydrationError}</div>
          ) : null}
          {isHydratingFromUrl ? (
            <div className="text-sm text-muted-foreground">Loading selection from URL...</div>
          ) : null}
          {compareError ? (
            <div className="text-sm text-red-600 dark:text-red-400">{compareError}</div>
          ) : null}
          {compareLoading ? (
            <div className="text-sm text-muted-foreground">Computing compare view...</div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (v === "policies" || v === "apps" || v === "settings") {
            setActiveTab(v);
          }
        }}
        className="w-full"
      >
        <TabsList className="inline-flex h-auto w-auto p-1 bg-muted/50 backdrop-blur-sm glass-surface">
          <TabsTrigger value="policies" className="rounded-sm">
            Policies ({compareRows.policies.length})
          </TabsTrigger>
          <TabsTrigger value="apps" className="rounded-sm">
            Apps ({compareRows.apps.length})
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-sm">
            Settings diff
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          <TabsContent value="policies">
            {subjectsArray.length < 2 ? (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Add 2 items to compare.
                </CardContent>
              </Card>
            ) : (
              <CompareTable subjects={subjectsArray} rows={compareRows.policies} title="Policies comparison" />
            )}
          </TabsContent>

          <TabsContent value="apps">
            {subjectsArray.length < 2 ? (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Add 2 items to compare.
                </CardContent>
              </Card>
            ) : (
              <CompareTable subjects={subjectsArray} rows={compareRows.apps} title="Apps comparison" />
            )}
          </TabsContent>

          <TabsContent value="settings">
            {subjectsArray.length < 2 ? (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Add 2 items to compare settings.
                </CardContent>
              </Card>
            ) : settingsDiff.isLoading ? (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Loading settings diff (Settings Catalog + Endpoint Security)…
                </CardContent>
              </Card>
            ) : settingsDiff.error ? (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 text-sm text-red-600 dark:text-red-400">
                  {(settingsDiff.error as any)?.message ?? "Failed to load settings diff."}
                </CardContent>
              </Card>
            ) : (
              <Card className="glass-card dark:glass-card-dark">
                <CardContent className="pt-6 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold">Settings diff</h2>
                    <p className="text-sm text-muted-foreground">
                      Showing only settings whose normalized values differ across the selected objects. Scope: Settings
                      Catalog + Endpoint Security policies.
                    </p>
                  </div>

                  <div className="rounded-xl overflow-hidden overflow-x-auto glass-card dark:glass-card-dark">
                    <Table style={{ tableLayout: "fixed", minWidth: 900 }}>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-primary/10">
                          <TableHead className="font-semibold text-primary" style={{ width: 360 }}>
                            Setting
                          </TableHead>
                          {subjectsArray.map((s) => (
                            <TableHead
                              key={`${s.type}:${s.id}`}
                              className="font-semibold text-primary"
                              style={{ width: 260 }}
                              title={s.subtitle ?? s.id}
                            >
                              <div className="truncate">{s.label}</div>
                              <div className="text-[10px] font-normal text-muted-foreground capitalize">
                                {s.type}
                              </div>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(settingsDiff.data ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={1 + subjectsArray.length} className="text-center h-20 text-muted-foreground">
                              No differing settings found (within the supported policy types).
                            </TableCell>
                          </TableRow>
                        ) : (
                          (settingsDiff.data ?? []).slice(0, 200).map((row) => (
                            <TableRow key={row.settingName} className="border-b-primary/5">
                              <TableCell className="font-medium overflow-hidden">
                                <span className="truncate block">{row.settingName}</span>
                              </TableCell>
                              {subjectsArray.map((s) => {
                                const k = subjectKey(s);
                                const cell = row.perSubject[k];
                                return (
                                  <TableCell key={k} className="align-top">
                                    <div className="text-sm break-words">{cell?.value ?? "---"}</div>
                                    {cell?.sources?.length ? (
                                      <div className="mt-1 text-[10px] text-muted-foreground">
                                        {cell.sources.slice(0, 2).join(" - ")}
                                        {cell.sources.length > 2 ? " ..." : ""}
                                      </div>
                                    ) : null}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {(settingsDiff.data ?? []).length > 200 ? (
                    <div className="text-xs text-muted-foreground">
                      Showing first 200 differing settings (to keep the UI responsive).
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}


