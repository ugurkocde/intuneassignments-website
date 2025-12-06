"use client";

import { useCallback } from "react";
import { UserSearch } from "~/components/user-search";
import { AssignmentTree } from "~/components/assignment-tree";
import { useUserSearch, useUserAssignments } from "~/hooks/useUserAssignments";
import { Card, CardContent } from "~/components/ui/card";
import { Loader2, Users, Shield, AlertCircle, Search } from "lucide-react";
import { AnimatedProgress } from "~/components/ui/animated-progress";
import type { GraphUser } from "~/types/user";
import { Button } from "~/components/ui/button";

export default function UserAssignmentsPage() {
  const { search, isSearching } = useUserSearch();
  const {
    selectedUser,
    selectUser,
    clearSelection,
    data,
    isLoading,
    error,
    loadingState
  } = useUserAssignments();

  const handleSearch = useCallback(async (query: string) => {
    return await search(query);
  }, [search]);

  const handleSelect = useCallback((user: GraphUser) => {
    selectUser(user);
  }, [selectUser]);

  const handleClear = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  return (
    <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
      {/* Search Header - Glassmorphism */}
      <div className="relative z-50">
        <Card className="border-none shadow-lg bg-background/60 backdrop-blur-xl overflow-visible">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50 rounded-xl pointer-events-none" />
          <CardContent className="p-6 relative">
             <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
             <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="h-6 w-6 text-primary" />
                    User Policy Assignments
                </h1>
                <p className="text-muted-foreground mt-1">
                    Visualize Intune policies and group memberships
                </p>
             </div>
           </div>

          <div className="max-w-3xl">
            <UserSearch
                onSearch={handleSearch}
                onSelect={handleSelect}
                selectedUser={selectedUser}
                onClear={handleClear}
                isSearching={isSearching}
            />
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Main Visualization Area */}
      <Card className="flex-1 relative overflow-hidden border shadow-xl bg-background min-h-[600px]">
        {/* Empty State */}
        {!selectedUser && (
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6 space-y-6 animate-in zoom-in-95 duration-500">
                    <div className="relative mx-auto h-24 w-24">
                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse-glow" />
                        <div className="absolute inset-0 flex items-center justify-center">
                             <Search className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold">Ready to Explore</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Search for a user above to reveal their complete Intune policy landscape in an interactive network graph.
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Loading State */}
        {selectedUser && isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/50 backdrop-blur-sm">
            <Card className="w-full max-w-md mx-6 shadow-2xl">
              <CardContent className="pt-8 pb-8 px-8">
                <div className="flex flex-col items-center text-center gap-4 mb-6">
                  <div className="relative">
                      <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full" />
                      <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg mb-1">{loadingState.stage}</div>
                    <div className="text-sm text-muted-foreground">{loadingState.details}</div>
                  </div>
                </div>
                <AnimatedProgress value={loadingState.progress} className="h-2" />
                <div className="text-center text-xs font-mono text-primary/80 mt-3">
                  {Math.round(loadingState.progress)}% COMPLETE
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Error State */}
        {selectedUser && error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-6 border-red-500/50 bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-50">
              <CardContent className="pt-6 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Unable to Load Assignments</h3>
                <p className="text-sm text-red-700 dark:text-red-200/80 mb-6">
                  {error instanceof Error ? error.message : "An unexpected error occurred while fetching data."}
                </p>
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  className="w-full"
                >
                  Try Another User
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 2D Network Graph Visualization */}
        {selectedUser && data && !isLoading && !error && (
          <>
            {data.assignments.length > 0 ? (
              <div className="absolute inset-0 w-full h-full animate-in fade-in duration-1000 fill-mode-forwards" style={{ animationDelay: '0.2s' }}>
                <AssignmentTree
                    data={data}
                    className="h-full w-full"
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                   <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Shield className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">No Active Policies</h2>
                  <p className="text-muted-foreground mb-6">
                    <span className="font-medium text-foreground">{data.user.displayName}</span> is in {data.groups.length} group{data.groups.length !== 1 ? "s" : ""}, but no Intune policies are currently assigned.
                  </p>
                  <Button variant="secondary" onClick={handleClear}>
                    Search Another User
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Stats Panel */}
        {selectedUser && data && !isLoading && !error && data.assignments.length > 0 && (
          <div className="absolute bottom-6 left-6 z-10">
              <div className="bg-background/80 backdrop-blur-md border rounded-xl shadow-xl overflow-hidden">
                  <div className="flex items-center divide-x">
                      <div className="px-4 py-3 flex flex-col items-center min-w-[80px]">
                           <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Groups</span>
                           <span className="text-xl font-bold">{data.groups.length}</span>
                      </div>
                       <div className="px-4 py-3 flex flex-col items-center min-w-[80px]">
                           <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Policies</span>
                           <span className="text-xl font-bold text-primary">{data.totalPolicies}</span>
                      </div>
                       <div className="px-4 py-3 flex flex-col items-center min-w-[80px]">
                           <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Sources</span>
                           <span className="text-xl font-bold text-blue-500">{data.assignments.length}</span>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </Card>
    </div>
  );
}
