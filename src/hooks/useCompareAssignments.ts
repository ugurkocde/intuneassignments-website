"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CompareSubject } from "~/types/compare";
import { subjectKey } from "~/types/compare";
import type { PolicyData } from "~/types/graph";
import { getDeviceGroups, getUserGroups } from "~/services/graph";

export type ComparePresence = {
  present: boolean;
  excluded: boolean;
  reasons: string[];
  filters: string[];
};

export type CompareComputed = {
  perSubject: Record<string, Map<string, ComparePresence>>;
  // Convenience lists used by settings diff, etc.
  effectivePolicyIdsBySubject: Record<string, Set<string>>;
};

const formatFilter = (filterType?: string, filterId?: string) => {
  if (!filterId) return null;

  const normalizedId = filterId.trim().toLowerCase();
  const normalizedType = (filterType ?? "").trim().toLowerCase();

  // Graph often returns a "none" filter with the all-zero GUID; treat as no filter.
  if (
    normalizedType === "none" ||
    normalizedId === "00000000-0000-0000-0000-000000000000"
  ) {
    return null;
  }

  const shortId =
    normalizedId.length >= 8 ? `${filterId.slice(0, 8)}…` : filterId;

  if (filterType) return `Filter ${filterType}: ${shortId}`;
  return `Filter: ${shortId}`;
};

export function useCompareAssignments({
  subjects,
  policies,
  getAccessToken,
}: {
  subjects: CompareSubject[];
  policies: PolicyData[];
  getAccessToken: () => Promise<string>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [computed, setComputed] = useState<CompareComputed>({
    perSubject: {},
    effectivePolicyIdsBySubject: {},
  });

  // Stable signature to prevent effects re-running on array identity changes.
  const subjectsSignature = useMemo(
    () => subjects.map(subjectKey).join("|"),
    [subjects],
  );

  // Prevent infinite loops when dependencies churn and subjects is empty.
  const prevHadSubjectsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (subjects.length === 0) {
      // Only reset once when transitioning from having subjects -> empty.
      if (prevHadSubjectsRef.current) {
        setComputed({ perSubject: {}, effectivePolicyIdsBySubject: {} });
        setError("");
        setLoading(false);
      }
      prevHadSubjectsRef.current = false;
      return;
    }
    prevHadSubjectsRef.current = true;
    if (policies.length === 0) return;

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const token = await getAccessToken();
        const perSubject: Record<string, Map<string, ComparePresence>> = {};
        const effectivePolicyIdsBySubject: Record<string, Set<string>> = {};

        for (const s of subjects) {
          const k = subjectKey(s);
          const presenceMap = new Map<string, ComparePresence>();
          perSubject[k] = presenceMap;
          effectivePolicyIdsBySubject[k] = new Set<string>();

          if (s.type === "group") {
            for (const p of policies) {
              const isAssigned = p.assignedGroupIds.includes(s.id);
              const isExcluded = p.excludedGroupIds.includes(s.id);
              if (!isAssigned && !isExcluded) continue;

              const reasons: string[] = [];
              const filters: string[] = [];

              if (isAssigned) reasons.push("Direct group assignment");
              if (isExcluded) reasons.push("Excluded by group target");

              const matchingDetails = (p.assignmentDetails ?? []).filter(
                (d) =>
                  (d.targetKind === "group" || d.targetKind === "exclusionGroup") &&
                  d.groupId === s.id,
              );
              for (const d of matchingDetails) {
                const f = formatFilter(
                  d.deviceAndAppManagementAssignmentFilterType,
                  d.deviceAndAppManagementAssignmentFilterId,
                );
                if (f) filters.push(f);
              }

              presenceMap.set(p.id, {
                present: true,
                excluded: isExcluded,
                reasons,
                filters: Array.from(new Set(filters)),
              });

              if (!isExcluded) effectivePolicyIdsBySubject[k].add(p.id);
            }
            continue;
          }

          const isUser = s.type === "user";
          const groups = isUser ? await getUserGroups(token, s.id) : await getDeviceGroups(token, s.id);
          const groupIds = new Set(groups.map((g) => g.id));
          const groupIdToName = new Map(groups.map((g) => [g.id, g.displayName]));
          const allTargetKind = isUser ? "allUsers" : "allDevices";
          const allTargetLabel = isUser ? "All Users" : "All Devices";

          for (const p of policies) {
            const details = p.assignmentDetails ?? [];
            const includeDetails = details.filter((d) => {
              if (d.targetKind === allTargetKind) return true;
              if (d.targetKind === "group" && d.groupId && groupIds.has(d.groupId)) return true;
              return false;
            });
            const excludeDetails = details.filter(
              (d) => d.targetKind === "exclusionGroup" && d.groupId && groupIds.has(d.groupId),
            );

            const includedCandidate =
              // Backward-compatible fallback if assignmentDetails missing
              includeDetails.length > 0 ||
              p.assignmentStatus === allTargetLabel ||
              p.assignedGroupIds.some((gid) => groupIds.has(gid));

            const excludedByMembership =
              excludeDetails.length > 0 ||
              p.excludedGroupIds.some((gid) => groupIds.has(gid));

            // Match logic mirrors assignments detail: show union(candidate, excluded)
            if (!includedCandidate && !excludedByMembership) continue;

            const reasons: string[] = [];
            const filters: string[] = [];

            if (includedCandidate) {
              // Prefer assignmentDetails-derived reasons when available
              if (includeDetails.length > 0) {
                for (const d of includeDetails) {
                  if (d.targetKind === allTargetKind) reasons.push(allTargetLabel);
                  if (d.targetKind === "group" && d.groupId) {
                    reasons.push(groupIdToName.get(d.groupId) ?? d.groupId);
                  }
                  const f = formatFilter(
                    d.deviceAndAppManagementAssignmentFilterType,
                    d.deviceAndAppManagementAssignmentFilterId,
                  );
                  if (f) filters.push(f);
                }
              } else if (p.assignmentStatus === allTargetLabel) {
                reasons.push(allTargetLabel);
              } else {
                // Fallback: show first matching group assignment id/name
                const gid = p.assignedGroupIds.find((id) => groupIds.has(id));
                if (gid) reasons.push(groupIdToName.get(gid) ?? gid);
              }
            }

            if (excludedByMembership) {
              if (excludeDetails.length > 0) {
                for (const d of excludeDetails) {
                  if (d.groupId) {
                    reasons.push(`Excluded via ${groupIdToName.get(d.groupId) ?? d.groupId}`);
                  } else {
                    reasons.push("Excluded");
                  }
                  const f = formatFilter(
                    d.deviceAndAppManagementAssignmentFilterType,
                    d.deviceAndAppManagementAssignmentFilterId,
                  );
                  if (f) filters.push(f);
                }
              } else {
                const gid = p.excludedGroupIds.find((id) => groupIds.has(id));
                if (gid) reasons.push(`Excluded via ${groupIdToName.get(gid) ?? gid}`);
                else reasons.push("Excluded");
              }
            }

            const excluded = excludedByMembership;
            presenceMap.set(p.id, {
              present: true,
              excluded,
              reasons: Array.from(new Set(reasons)).slice(0, 6),
              filters: Array.from(new Set(filters)).slice(0, 6),
            });

            if (includedCandidate && !excluded) {
              effectivePolicyIdsBySubject[k].add(p.id);
            }
          }
        }

        if (!cancelled) {
          setComputed({ perSubject, effectivePolicyIdsBySubject });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to compute compare assignments");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken, policies, subjectsSignature, subjects.length]);

  return { loading, error, computed };
}


