import { useMsal } from "@azure/msal-react";
import { useQuery } from "@tanstack/react-query";
import { loginRequest } from "~/config/authConfig";
import {
  fetchAdminTemplates,
  fetchAppConfigurationPolicies,
  fetchAppProtectionPolicies,
  fetchAutopilotProfiles,
  fetchCloudPCProvisioningPolicies,
  fetchCloudPCUserSettings,
  fetchCompliancePolicies,
  fetchConfigurationPolicies,
  fetchDeviceConfigurations,
  fetchDeviceManagementIntents,
  fetchESPProfiles,
  fetchMobileApps,
  fetchProactiveRemediationScripts,
  fetchScripts,
  resolveGroupIds,
} from "~/services/graph";
import type { Assignment, AssignmentDetail, PolicyData } from "~/types/graph";
import { useState, useEffect } from "react";

// Export loading state interface
export interface LoadingState {
  stage: string;
  progress: number;
  details: string;
}

// Helper function to add artificial delay with random variation
const sleep = (ms: number, variation = 0.3) => {
  const randomMs = ms + (Math.random() * 2 - 1) * ms * variation;
  return new Promise((resolve) => setTimeout(resolve, randomMs));
};

// Global listener for loading state (simple event emitter pattern)
let loadingListener: ((state: LoadingState) => void) | null = null;

const setLoadingState = (state: LoadingState) => {
  if (loadingListener) loadingListener(state);
};

export const useLoadingState = () => {
  const [state, setState] = useState<LoadingState>({
    stage: "Idle",
    progress: 0,
    details: "",
  });

  useEffect(() => {
    loadingListener = setState;
    return () => {
      loadingListener = null;
    };
  }, []);

  return state;
};

export const useIntunePolicies = () => {
  const { instance, accounts } = useMsal();

  const getAccessToken = async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");

    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken;
  };

  return useQuery({
    queryKey: ["intunePolicies"],
    queryFn: async () => {
      setLoadingState({
        stage: "Authenticating",
        progress: 5,
        details: "Acquiring access token...",
      });
      await sleep(800);
      const token = await getAccessToken();
      await sleep(600);

      setLoadingState({
        stage: "Fetching Policies",
        progress: 10,
        details: "Starting parallel fetch of Intune policies...",
      });
      await sleep(500);

      // Track progress through fetching stages
      let fetchProgress = 10;
      const progressIncrement = 50 / 14; // 14 fetch operations, spread across 10% to 60%

      // Concurrency implementation
      const parallelLimit = async <T>(
        items: any[],
        fn: (item: any) => Promise<T>,
        limit: number,
      ): Promise<T[]> => {
        const results: T[] = [];
        const executing: Promise<any>[] = [];

        for (const item of items) {
          const p = Promise.resolve().then(() => fn(item));
          results.push(p as any);

          const e: Promise<any> = p.then(() =>
            executing.splice(executing.indexOf(e), 1),
          );
          executing.push(e);

          if (executing.length >= limit) {
            await Promise.race(executing);
          }
        }
        return Promise.all(results);
      };

      // Prepare fetch tasks
      const fetchTasks = [
        { fetcher: fetchDeviceConfigurations, name: "Device Configurations" },
        { fetcher: fetchCompliancePolicies, name: "Compliance Policies" },
        { fetcher: fetchMobileApps, name: "Applications" },
        { fetcher: fetchScripts, name: "Scripts" },
        { fetcher: fetchConfigurationPolicies, name: "Settings Catalog" },
        { fetcher: fetchAdminTemplates, name: "Admin Templates" },
        {
          fetcher: fetchAppProtectionPolicies,
          name: "App Protection Policies",
        },
        { fetcher: fetchAppConfigurationPolicies, name: "App Config Policies" },
        {
          fetcher: fetchProactiveRemediationScripts,
          name: "Proactive Remediation",
        },
        { fetcher: fetchAutopilotProfiles, name: "Autopilot Profiles" },
        { fetcher: fetchESPProfiles, name: "ESP Profiles" },
        {
          fetcher: fetchCloudPCProvisioningPolicies,
          name: "Cloud PC Provisioning",
        },
        { fetcher: fetchCloudPCUserSettings, name: "Cloud PC User Settings" },
        {
          fetcher: fetchDeviceManagementIntents,
          name: "Endpoint Security Intents",
        },
      ];

      // Execute with concurrency limit (e.g., 3 concurrent requests)
      const MAX_CONCURRENT_REQUESTS = 3;

      const results = await parallelLimit(
        fetchTasks,
        async (task) => {
          setLoadingState({
            stage: "Fetching Policies",
            progress: Math.min(60, fetchProgress),
            details: `Fetching ${task.name}...`,
          });

          try {
            const result = await task.fetcher(token);
            fetchProgress += progressIncrement;
            return result;
          } catch (e) {
            console.error(`Error fetching ${task.name}`, e);
            fetchProgress += progressIncrement;
            return []; // Return empty array on failure to prevent entire dashboard crash
          }
        },
        MAX_CONCURRENT_REQUESTS,
      );

      // Unpack results
      const [
        deviceConfigs,
        compliancePolicies,
        apps,
        scripts,
        configPolicies,
        adminTemplates,
        appProtectionPolicies,
        appConfigPolicies,
        healthScripts,
        autopilotProfiles,
        espProfiles,
        cloudPCProvisioning,
        cloudPCUserSettings,
        intents,
      ] = results as [
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
        any[],
      ];

      setLoadingState({
        stage: "Processing",
        progress: 70,
        details: "Processing policies and extracting assignments...",
      });
      await sleep(800);

      // Collect all policies first to extract group IDs
      const allRawPolicies: {
        policy: any;
        type: PolicyData["type"];
        assignments?: Assignment[];
      }[] = [];

      const addPolicy = (
        policy: any,
        type: PolicyData["type"],
        assignments?: Assignment[],
      ) => {
        allRawPolicies.push({
          policy,
          type,
          assignments: assignments || policy.assignments,
        });
      };

      // Filter Config Policies and Intents for Endpoint Security
      const endpointSecurityCategories = {
        endpointSecurityAntivirus: "Endpoint Security - Antivirus",
        endpointSecurityDiskEncryption: "Endpoint Security - Disk Encryption",
        endpointSecurityFirewall: "Endpoint Security - Firewall",
        endpointSecurityEndpointDetectionAndResponse: "Endpoint Security - EDR",
        endpointSecurityAttackSurfaceReductionRules: "Endpoint Security - ASR",
        endpointSecurityEndpointPrivilegeManagement: "Endpoint Security - EPM",
      } as const;

      // Process Standard and ES Policies
      configPolicies.forEach((p) => {
        const templateFamily = (p as any).templateReference?.templateFamily;
        if (templateFamily && templateFamily in endpointSecurityCategories) {
          addPolicy(
            p,
            endpointSecurityCategories[
              templateFamily as keyof typeof endpointSecurityCategories
            ] as PolicyData["type"],
          );
        } else {
          addPolicy(p, "Settings Catalog");
        }
      });

      intents.forEach((p) => {
        const templateFamily = (p as any).templateReference?.templateFamily;
        if (templateFamily && templateFamily in endpointSecurityCategories) {
          addPolicy(
            p,
            endpointSecurityCategories[
              templateFamily as keyof typeof endpointSecurityCategories
            ] as PolicyData["type"],
          );
        }
      });

      deviceConfigs.forEach((p) => addPolicy(p, "Device Configuration"));
      compliancePolicies.forEach((p) => addPolicy(p, "Compliance Policy"));
      apps.forEach((p) => addPolicy(p, "Application"));
      scripts.forEach((p) => addPolicy(p, "Script"));
      adminTemplates.forEach((p) => addPolicy(p, "Administrative Template"));
      appProtectionPolicies.forEach((p) =>
        addPolicy(p, "App Protection Policy"),
      );
      appConfigPolicies.forEach((p) =>
        addPolicy(p, "App Configuration Policy"),
      );
      healthScripts.forEach((p) =>
        addPolicy(p, "Proactive Remediation Script"),
      );
      autopilotProfiles.forEach((p) => addPolicy(p, "Autopilot Profile"));
      espProfiles
        .filter((p: any) =>
          p["@odata.type"]?.includes("EnrollmentCompletionPageConfiguration"),
        )
        .forEach((p) => addPolicy(p, "Enrollment Status Page"));
      cloudPCProvisioning.forEach((p) =>
        addPolicy(p, "Cloud PC Provisioning Policy"),
      );
      cloudPCUserSettings.forEach((p) => addPolicy(p, "Cloud PC User Setting"));

      // Extract all Group IDs
      const groupIds = new Set<string>();
      allRawPolicies.forEach((item) => {
        const assignments = item.assignments || [];
        assignments.forEach((a) => {
          if (
            a.target["@odata.type"].includes("groupAssignmentTarget") &&
            a.target.groupId
          ) {
            groupIds.add(a.target.groupId);
          }
          if (
            a.target["@odata.type"].includes(
              "exclusionGroupAssignmentTarget",
            ) &&
            a.target.groupId
          ) {
            groupIds.add(a.target.groupId);
          }
        });
      });

      setLoadingState({
        stage: "Resolving Groups",
        progress: 85,
        details: `Resolving names for ${groupIds.size} groups...`,
      });
      await sleep(900);

      // Batch resolve Group Names
      const groupMap = await resolveGroupIds(token, Array.from(groupIds));
      await sleep(700);

      setLoadingState({
        stage: "Finalizing",
        progress: 95,
        details: "Finalizing data structure...",
      });
      await sleep(600);

      // Construct Final Policy Data
      const finalPolicies: PolicyData[] = allRawPolicies.map((item) => {
        const { policy, type, assignments: manualAssignments } = item;
        const assignments: Assignment[] =
          manualAssignments || policy.assignments || [];

        const assignmentDetails: AssignmentDetail[] = assignments.map((a) => {
          const odata = a.target?.["@odata.type"] ?? "";
          let targetKind: AssignmentDetail["targetKind"] = "other";
          if (odata.includes("allLicensedUsersAssignmentTarget"))
            targetKind = "allUsers";
          else if (odata.includes("allDevicesAssignmentTarget"))
            targetKind = "allDevices";
          else if (odata.includes("groupAssignmentTarget"))
            targetKind = "group";
          else if (odata.includes("exclusionGroupAssignmentTarget"))
            targetKind = "exclusionGroup";

          return {
            targetKind,
            groupId: a.target?.groupId,
            intent: a.intent,
            deviceAndAppManagementAssignmentFilterId:
              a.target?.deviceAndAppManagementAssignmentFilterId,
            deviceAndAppManagementAssignmentFilterType:
              a.target?.deviceAndAppManagementAssignmentFilterType,
          };
        });

        let status: PolicyData["assignmentStatus"] = "None";
        const assignedTo: string[] = [];
        const assignedGroupIds: string[] = [];
        const excludedGroupIds: string[] = [];
        let platform: string | undefined = undefined;

        // Try to determine platform
        if (policy.platforms) {
          platform = policy.platforms; // Some policies have this property
        } else if (policy["@odata.type"]) {
          const typeStr = policy["@odata.type"].toLowerCase();
          if (typeStr.includes("windows")) platform = "Windows";
          else if (typeStr.includes("ios")) platform = "iOS";
          else if (typeStr.includes("android")) platform = "Android";
          else if (typeStr.includes("macos")) platform = "macOS";
        }

        if (!platform) {
          // Fallback platform detection from name or description if still unknown
          const text = (
            policy.displayName +
            " " +
            (policy.description || "")
          ).toLowerCase();
          if (text.includes("windows")) platform = "Windows";
          else if (text.includes("ios") || text.includes("ipad"))
            platform = "iOS";
          else if (text.includes("android")) platform = "Android";
          else if (text.includes("macos") || text.includes("mac os"))
            platform = "macOS";
        }

        if (assignments.length > 0) {
          const hasAllUsers = assignments.some((a) =>
            a.target["@odata.type"].includes(
              "allLicensedUsersAssignmentTarget",
            ),
          );
          const hasAllDevices = assignments.some((a) =>
            a.target["@odata.type"].includes("allDevicesAssignmentTarget"),
          );
          const groupAssignments = assignments.filter((a) =>
            a.target["@odata.type"].includes("groupAssignmentTarget"),
          );
          const exclusions = assignments.filter((a) =>
            a.target["@odata.type"].includes("exclusionGroupAssignmentTarget"),
          );

          if (hasAllUsers) status = "All Users";
          else if (hasAllDevices) status = "All Devices";
          else if (groupAssignments.length > 0) status = "Group";

          // Resolve group names
          for (const g of groupAssignments) {
            if (g.target.groupId) {
              assignedGroupIds.push(g.target.groupId);
              const name =
                groupMap[g.target.groupId] || `Group ${g.target.groupId}`;
              assignedTo.push(name);
            }
          }

          for (const g of exclusions) {
            if (g.target.groupId) {
              excludedGroupIds.push(g.target.groupId);
              const name =
                groupMap[g.target.groupId] || `Group ${g.target.groupId}`;
              assignedTo.push(`[Excluded] ${name}`);
            }
          }
        }

        return {
          id: policy.id,
          name: policy.displayName || policy.name || "Unknown",
          type,
          assignmentStatus: status,
          assignedTo,
          assignedGroupIds,
          excludedGroupIds,
          assignmentDetails,
          platform,
          // Fields for Intune URL generation
          odataType: policy["@odata.type"],
          templateId: policy.templateReference?.templateId,
          templateDisplayName: policy.templateReference?.templateDisplayName,
          technologies: policy.technologies,
          platforms: policy.platforms,
          // Timestamps
          createdDateTime: policy.createdDateTime,
          lastModifiedDateTime: policy.lastModifiedDateTime,
        };
      });

      setLoadingState({ stage: "Complete", progress: 100, details: "Done!" });
      return finalPolicies;
    },
    enabled: accounts.length > 0,
  });
};
