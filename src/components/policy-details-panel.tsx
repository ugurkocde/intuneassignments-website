"use client";

import { useEffect, useState } from "react";
import { X, ExternalLink, Calendar, Tag, Users, Settings, Loader2, AlertCircle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { getIntuneUrl, formatPolicyDate } from "~/lib/intune-urls";
import { fetchPolicyConfiguration, type PolicyConfigItem } from "~/services/policy-config";
import type { UserAssignmentPolicy } from "~/types/user";

interface PolicyDetailsPanelProps {
  policy: UserAssignmentPolicy | null;
  onClose: () => void;
  getAccessToken?: () => Promise<string>;
}

export function PolicyDetailsPanel({ policy, onClose, getAccessToken }: PolicyDetailsPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [config, setConfig] = useState<PolicyConfigItem[] | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Handle animation timing
  useEffect(() => {
    if (policy) {
      // Small delay to trigger animation
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
    // Wait for animation to complete before calling onClose
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

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-md bg-background shadow-2xl transition-transform duration-200 ease-out",
          isVisible ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Policy Details</h2>
          <button
            onClick={handleClose}
            className="rounded-md p-2 hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          <div className="flex-1 p-6 space-y-6">
            {/* Policy Name */}
            <div>
              <h3 className="text-xl font-bold text-foreground leading-tight">
                {policy.name}
              </h3>
            </div>

            {/* Badge */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                <Tag className="h-3 w-3" />
                {policy.type}
              </span>
            </div>

            {/* Assigned Via */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span>Assigned via</span>
              </div>
              <div className="font-medium text-foreground">
                {policy.inheritedVia}
              </div>
            </div>

            {/* Description */}
            {policy.description && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Description
                </h4>
                <p className="text-sm text-foreground leading-relaxed">
                  {policy.description}
                </p>
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

              {/* Loading State */}
              {configLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading configuration...</span>
                </div>
              )}

              {/* Error State */}
              {configError && !configLoading && (
                <div className="flex items-center gap-2 py-4 px-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{configError}</span>
                </div>
              )}

              {/* No getAccessToken available */}
              {!getAccessToken && !configLoading && (
                <div className="text-sm text-muted-foreground py-4">
                  Configuration details not available
                </div>
              )}

              {/* Configuration List */}
              {config && config.length > 0 && !configLoading && (
                <div className="bg-muted/30 rounded-lg divide-y divide-border">
                  {config.map((item, index) => (
                    <div key={index} className="px-3 py-2.5 flex flex-col gap-1">
                      <span className="text-sm text-muted-foreground">
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

              {/* Empty Config */}
              {config?.length === 0 && !configLoading && (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  No configuration settings found
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-3">
              {policy.lastModifiedDateTime && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Last Modified: </span>
                    <span className="text-foreground">
                      {formatPolicyDate(policy.lastModifiedDateTime)}
                    </span>
                  </div>
                </div>
              )}

              {policy.platform && (
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-muted-foreground">Platform: </span>
                    <span className="text-foreground">{policy.platform}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t p-6">
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
