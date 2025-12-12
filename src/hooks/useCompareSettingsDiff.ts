"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompareSubject } from "~/types/compare";
import { subjectKey } from "~/types/compare";
import type { PolicyData } from "~/types/graph";
import { fetchPolicyConfiguration } from "~/services/policy-config";

export type SettingsDiffRow = {
  settingName: string;
  perSubject: Record<
    string,
    {
      value: string;
      sources: string[];
    }
  >;
};

const isEligiblePolicyTypeForSettingsDiff = (p: PolicyData) =>
  p.type === "Settings Catalog" || p.type.startsWith("Endpoint Security");

const parallelLimit = async <T,>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> => {
  const results: T[] = [];
  const executing: Promise<void>[] = [];

  for (const task of tasks) {
    const p = (async () => {
      const r = await task();
      results.push(r);
    })();

    const e = p.then(() => {
      const idx = executing.indexOf(e);
      if (idx >= 0) executing.splice(idx, 1);
    });
    executing.push(e);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
};

export function useCompareSettingsDiff({
  enabled,
  subjects,
  policies,
  effectivePolicyIdsBySubject,
  getAccessToken,
}: {
  enabled: boolean;
  subjects: CompareSubject[];
  policies: PolicyData[];
  effectivePolicyIdsBySubject: Record<string, Set<string>>;
  getAccessToken: () => Promise<string>;
}) {
  const queryClient = useQueryClient();

  const policyById = useMemo(() => {
    const map = new Map<string, PolicyData>();
    for (const p of policies) map.set(p.id, p);
    return map;
  }, [policies]);

  const subjectKeys = useMemo(() => subjects.map(subjectKey), [subjects]);

  return useQuery({
    queryKey: ["compareSettingsDiff", subjectKeys],
    enabled: enabled && subjects.length >= 2,
    queryFn: async (): Promise<SettingsDiffRow[]> => {
      const token = await getAccessToken();

      // subjectKey -> settingName -> { values: Set<string>, sources: Set<string> }
      const subjectSettings = new Map<
        string,
        Map<string, { values: Set<string>; sources: Set<string> }>
      >();

      const tasks: Array<() => Promise<void>> = [];

      for (const s of subjects) {
        const sk = subjectKey(s);
        subjectSettings.set(sk, new Map());
        const ids = effectivePolicyIdsBySubject[sk] ?? new Set<string>();

        for (const policyId of ids) {
          const policy = policyById.get(policyId);
          if (!policy) continue;
          if (!isEligiblePolicyTypeForSettingsDiff(policy)) continue;

          tasks.push(async () => {
            const items = await queryClient.fetchQuery({
              queryKey: ["policyConfig", policy.id, policy.type],
              queryFn: () =>
                fetchPolicyConfiguration(
                  token,
                  policy.id,
                  policy.type,
                  policy.odataType,
                ),
              staleTime: 5 * 60 * 1000,
            });

            const map = subjectSettings.get(sk)!;
            for (const item of items) {
              const name = item.name;
              const value = String(item.value ?? "Not configured");
              if (!map.has(name)) {
                map.set(name, { values: new Set(), sources: new Set() });
              }
              const entry = map.get(name)!;
              entry.values.add(value);
              entry.sources.add(policy.name);
            }
          });
        }
      }

      // Avoid hammering Graph
      await parallelLimit(tasks, 4);

      // Build union of setting names
      const allSettingNames = new Set<string>();
      for (const [, settingsMap] of subjectSettings.entries()) {
        for (const name of settingsMap.keys()) allSettingNames.add(name);
      }

      const rows: SettingsDiffRow[] = [];
      for (const name of allSettingNames) {
        const perSubject: SettingsDiffRow["perSubject"] = {};
        const valuesAcrossSubjects: string[] = [];

        for (const sk of subjectKeys) {
          const setting = subjectSettings.get(sk)?.get(name);
          const value = setting
            ? Array.from(setting.values).join(" | ")
            : "—";
          const sources = setting ? Array.from(setting.sources) : [];
          perSubject[sk] = { value, sources };
          valuesAcrossSubjects.push(value);
        }

        const unique = new Set(valuesAcrossSubjects);
        if (unique.size <= 1) continue; // only show differing settings

        rows.push({ settingName: name, perSubject });
      }

      rows.sort((a, b) => a.settingName.localeCompare(b.settingName));
      return rows;
    },
  });
}


