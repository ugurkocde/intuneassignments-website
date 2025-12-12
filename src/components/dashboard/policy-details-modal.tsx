"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Calendar, Tag, Users, Settings, Loader2, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { getIntuneUrl, formatPolicyDate } from "~/lib/intune-urls";
import { fetchPolicyConfiguration, type PolicyConfigItem } from "~/services/policy-config";
import type { PolicyData } from "~/types/graph";

const STATUS_COLORS: Record<string, string> = {
  "Assigned": "#22c55e",
  "Unassigned": "#ef4444",
};

const ASSIGNMENT_COLORS: Record<string, string> = {
  "All Users": "#8b5cf6",
  "All Devices": "#3b82f6",
};

interface PolicyDetailsModalProps {
  policy: PolicyData | null;
  onClose: () => void;
  getAccessToken?: () => Promise<string>;
}

export function PolicyDetailsModal({ policy, onClose, getAccessToken }: PolicyDetailsModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<PolicyConfigItem[] | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Handle animation timing
  useEffect(() => {
    if (policy) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [policy]);

  // Fetch configuration when policy changes
  useEffect(() => {
    if (!policy || !getAccessToken) {
      setConfig(null);
      setConfigError(null);
      return;
    }

    const loadConfig = async () => {
      setConfigLoading(true);
      setConfigError(null);
      setConfig(null);

      try {
        const token = await getAccessToken();
        const items = await fetchPolicyConfiguration(
          token,
          policy.id,
          policy.type,
          policy.odataType
        );
        setConfig(items);
      } catch (e) {
        console.error("Failed to load policy configuration:", e);
        setConfigError("Failed to load configuration");
      } finally {
        setConfigLoading(false);
      }
    };

    void loadConfig();
  }, [policy, getAccessToken]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const openInIntune = () => {
    if (!policy) return;
    const url = getIntuneUrl(policy.id, policy.type, policy.odataType, {
      templateId: policy.templateId,
      templateDisplayName: policy.templateDisplayName,
      technologies: policy.technologies,
      platforms: policy.platforms,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!policy) return null;

  const isAssigned = policy.assignmentStatus !== "None";
  const statusLabel = isAssigned ? "Assigned" : "Unassigned";
  const statusColor = STATUS_COLORS[statusLabel];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-200",
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="bg-background rounded-xl shadow-2xl border max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-semibold">Policy Details</h2>
            <button
              onClick={handleClose}
              className="rounded-md p-2 hover:bg-muted transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Policy Name */}
            <div>
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {policy.name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground mt-1 select-all">
                {policy.id}
              </p>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Tag className="h-3 w-3" />
                {policy.type}
              </span>
              <Badge
                variant="outline"
                style={{
                  backgroundColor: statusColor + "15",
                  color: statusColor,
                  borderColor: statusColor + "40",
                }}
              >
                {statusLabel}
              </Badge>
            </div>

            {/* Assigned To Section */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Users className="h-4 w-4" />
                <span>Assigned To</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {policy.assignmentStatus === "All Users" && (
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: ASSIGNMENT_COLORS["All Users"] + "15",
                      color: ASSIGNMENT_COLORS["All Users"],
                      borderColor: ASSIGNMENT_COLORS["All Users"] + "40",
                    }}
                  >
                    All Users
                  </Badge>
                )}
                {policy.assignmentStatus === "All Devices" && (
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: ASSIGNMENT_COLORS["All Devices"] + "15",
                      color: ASSIGNMENT_COLORS["All Devices"],
                      borderColor: ASSIGNMENT_COLORS["All Devices"] + "40",
                    }}
                  >
                    All Devices
                  </Badge>
                )}
                {policy.assignedTo.length > 0 && (
                  <div className="w-full">
                    {policy.assignedTo.map((group, idx) => (
                      <div key={idx} className="text-sm text-foreground py-0.5">
                        {group}
                      </div>
                    ))}
                  </div>
                )}
                {policy.assignmentStatus === "None" && (
                  <span className="text-sm text-muted-foreground italic">Not assigned</span>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              {policy.createdDateTime && (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Created</div>
                    <div className="text-foreground">{formatPolicyDate(policy.createdDateTime)}</div>
                  </div>
                </div>
              )}
              {policy.lastModifiedDateTime && (
                <div className="flex items-start gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-muted-foreground">Modified</div>
                    <div className="text-foreground">{formatPolicyDate(policy.lastModifiedDateTime)}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Platform */}
            {policy.platform && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Platform:</span>
                <span className="text-foreground">{policy.platform}</span>
              </div>
            )}

            {/* Configuration Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium text-muted-foreground">
                  Configuration
                </h4>
              </div>

              {configLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading configuration...</span>
                </div>
              )}

              {configError && !configLoading && (
                <div className="flex items-center gap-2 py-3 px-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{configError}</span>
                </div>
              )}

              {!getAccessToken && !configLoading && (
                <div className="text-sm text-muted-foreground py-3">
                  Configuration details not available
                </div>
              )}

              {config && config.length > 0 && !configLoading && (
                <div className="bg-muted/30 rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {config.map((item, index) => (
                    <div key={index} className="px-3 py-2 flex flex-col gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {item.name}
                      </span>
                      <span className="text-sm font-medium text-foreground break-words">
                        {typeof item.value === "boolean"
                          ? item.value ? "Yes" : "No"
                          : String(item.value ?? "Not set")}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {config?.length === 0 && !configLoading && (
                <div className="text-sm text-muted-foreground py-3 text-center">
                  No configuration settings found
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 flex-shrink-0">
            <Button
              onClick={openInIntune}
              className="w-full cursor-pointer"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Intune
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
