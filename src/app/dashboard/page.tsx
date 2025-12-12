"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useIntunePolicies, useLoadingState } from "~/hooks/useIntuneData";
import { Input } from "~/components/ui/input";
import { useState, useMemo, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "~/config/authConfig";
import { LoadingCard } from "~/components/ui/loading-card";
import { DashboardStats } from "~/components/dashboard/dashboard-stats";
import { DashboardInsights } from "~/components/dashboard/dashboard-insights";
import { PoliciesTable } from "~/components/dashboard/policies-table";
import { Card, CardContent } from "~/components/ui/card";
import { SpotlightSearch } from "~/components/spotlight-search";
import { Search, Filter, Layers, Users, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const normalizeGroupName = (name: string) =>
  name.startsWith("[Excluded] ") ? name.slice("[Excluded] ".length) : name;

export default function DashboardPage() {
  const { data: policies, isLoading, error } = useIntunePolicies();
  const loadingState = useLoadingState();
  const { instance, accounts } = useMsal();
  const [searchTerm, setSearchTerm] = useState("");
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const getAccessToken = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account,
    });
    return response.accessToken;
  }, [instance, accounts]);

  const allPolicies = useMemo(() => policies ?? [], [policies]);

  // Get unique types for the filter dropdown (must be before early returns)
  const uniqueTypes = useMemo(() => {
    const types = new Set(allPolicies.map(p => p.type));
    return Array.from(types).sort();
  }, [allPolicies]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    allPolicies.forEach((p) => {
      p.assignedTo.forEach((g) => {
        const normalized = normalizeGroupName(g).trim();
        if (normalized) groups.add(normalized);
      });
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [allPolicies]);

  // Filter logic (must be before early returns)
  const filteredPolicies = useMemo(() => allPolicies.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const groupTerm = groupSearchTerm.trim().toLowerCase();
    const matchesGroup =
      groupTerm.length === 0 ||
      p.assignedTo.some((g) =>
        normalizeGroupName(g).toLowerCase().includes(groupTerm),
      );
    let matchesAssignment = true;
    if (assignmentFilter === "assigned") {
      matchesAssignment = p.assignmentStatus !== "None";
    } else if (assignmentFilter === "unassigned") {
      matchesAssignment = p.assignmentStatus === "None";
    }
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    return (
      matchesSearch && matchesGroup && matchesAssignment && matchesType
    );
  }), [allPolicies, searchTerm, groupSearchTerm, assignmentFilter, typeFilter]);

  if (isLoading) {
    return (
      <div className="flex w-full flex-col items-center justify-center px-4 sm:px-6 py-10 min-h-[60vh]">
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
      <div className="flex h-screen items-center justify-center p-4 bg-background">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 glass-card dark:glass-card-dark">
          <CardContent className="flex flex-col items-center gap-2 pt-6">
            <div className="text-red-500 font-semibold text-lg">Error Loading Data</div>
            <div className="text-sm text-muted-foreground">{error.message}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Summary Stats
  const totalPolicies = allPolicies.length;
  const unassignedCount = allPolicies.filter(p => p.assignmentStatus === "None").length;
  const allUsersCount = allPolicies.filter(p => p.assignmentStatus === "All Users").length;
  const allDevicesCount = allPolicies.filter(p => p.assignmentStatus === "All Devices").length;

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your Intune environment assignments</p>
        </div>
      </div>

      {/* Hero Quick Search (Global Spotlight) */}
      <section
        aria-label="Quick search"
        className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-indigo-500/10 via-background/60 to-purple-500/10 p-5 sm:p-7 backdrop-blur-sm"
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-24 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold tracking-tight text-foreground">
              Quick search
            </div>
            <p className="text-sm text-muted-foreground">
              Jump to a user, device, or group. Press <span className="font-mono">⌘/Ctrl K</span> anytime.
            </p>
          </div>

          <div className="w-full sm:max-w-xl">
            <SpotlightSearch triggerVariant="hero" />
          </div>
        </div>
      </section>
      
      <DashboardStats 
        totalPolicies={totalPolicies}
        unassignedCount={unassignedCount}
        allUsersCount={allUsersCount}
        allDevicesCount={allDevicesCount}
      />

      {/* Consolidated Insights Section (Health, Platform, Groups, Policy Types) */}
      <DashboardInsights
        policies={allPolicies}
        onGroupSelect={(groupName) => {
          setGroupSearchTerm(groupName);
          setAssignmentFilter("assigned");
        }}
      />

      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full overflow-x-auto pb-2 sm:pb-0">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="inline-flex h-auto w-auto p-1 bg-muted/50 backdrop-blur-sm glass-surface">
                <TabsTrigger value="overview" className="rounded-sm">Overview</TabsTrigger>
                <TabsTrigger value="deviceConfig" className="rounded-sm">Device Configs</TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-sm">Compliance</TabsTrigger>
                <TabsTrigger value="endpointSecurity" className="rounded-sm">Endpoint Security</TabsTrigger>
                <TabsTrigger value="apps" className="rounded-sm">Apps</TabsTrigger>
                <TabsTrigger value="scripts" className="rounded-sm">Scripts</TabsTrigger>
                <TabsTrigger value="enrollment" className="rounded-sm">Enrollment</TabsTrigger>
                <TabsTrigger value="cloudpc" className="rounded-sm">Windows 365</TabsTrigger>
                <TabsTrigger value="other" className="rounded-sm">Other</TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-2 mb-4">
                  <div className="relative w-full sm:w-auto sm:min-w-[280px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search policies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary glass-surface"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto sm:min-w-[280px]">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      list="group-suggestions"
                      placeholder="Filter by group (e.g. Marketing)..."
                      value={groupSearchTerm}
                      onChange={(e) => setGroupSearchTerm(e.target.value)}
                      className="pl-9 pr-9 bg-background/50 backdrop-blur-sm border-muted-foreground/20 focus-visible:ring-primary glass-surface"
                      aria-label="Filter policies by assigned group"
                    />
                    {groupSearchTerm.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => setGroupSearchTerm("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 hover:bg-muted/50"
                        aria-label="Clear group filter"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                    <datalist id="group-suggestions">
                      {uniqueGroups.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>
                  <Select value={assignmentFilter} onValueChange={(value: "all" | "assigned" | "unassigned") => setAssignmentFilter(value)}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-background/50 backdrop-blur-sm border-muted-foreground/20 glass-surface">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Policies</SelectItem>
                      <SelectItem value="assigned">Assigned Only</SelectItem>
                      <SelectItem value="unassigned">Unassigned Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[220px] bg-background/50 backdrop-blur-sm border-muted-foreground/20 glass-surface">
                      <Layers className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <TabsContent value="overview">
                  <PoliciesTable policies={filteredPolicies} getAccessToken={getAccessToken} />
                </TabsContent>

                {/* Other Tabs Contents */}
                {["deviceConfig", "compliance", "endpointSecurity", "apps", "scripts", "enrollment", "cloudpc", "other"].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue}>
                        <PoliciesTable getAccessToken={getAccessToken} policies={filteredPolicies.filter(p => {
                            if (tabValue === "deviceConfig") return p.type === "Device Configuration" || p.type === "Settings Catalog" || p.type === "Administrative Template";
                            if (tabValue === "compliance") return p.type === "Compliance Policy";
                            if (tabValue === "endpointSecurity") return p.type.startsWith("Endpoint Security");
                            if (tabValue === "apps") return p.type === "Application" || p.type === "App Protection Policy" || p.type === "App Configuration Policy";
                            if (tabValue === "scripts") return p.type === "Script" || p.type === "Proactive Remediation Script";
                            if (tabValue === "enrollment") return p.type === "Autopilot Profile" || p.type === "Enrollment Status Page";
                            if (tabValue === "cloudpc") return p.type === "Cloud PC Provisioning Policy" || p.type === "Cloud PC User Setting";
                            if (tabValue === "other") return !["Device Configuration", "Settings Catalog", "Administrative Template", "Compliance Policy", "Application", "App Protection Policy", "App Configuration Policy", "Script", "Proactive Remediation Script", "Autopilot Profile", "Enrollment Status Page", "Cloud PC Provisioning Policy", "Cloud PC User Setting"].includes(p.type) && !p.type.startsWith("Endpoint Security");
                            return false;
                        })} />
                    </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
