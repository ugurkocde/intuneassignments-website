import { useMsal } from "@azure/msal-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import { loginRequest } from "~/config/authConfig";
import {
  searchUsers,
  searchAll,
  getUserGroups,
  getDeviceGroups,
  fetchDeviceConfigurations,
  fetchCompliancePolicies,
  fetchMobileApps,
  fetchScripts,
  fetchConfigurationPolicies,
  fetchAdminTemplates,
  fetchAppProtectionPolicies,
  fetchAppConfigurationPolicies,
  fetchProactiveRemediationScripts,
  fetchAutopilotProfiles,
  fetchESPProfiles,
  fetchCloudPCProvisioningPolicies,
  fetchCloudPCUserSettings,
  fetchDeviceManagementIntents
} from "~/services/graph";
import type {
  GraphUser,
  GraphDevice,
  UserAssignmentData,
  GroupWithPolicies,
  UserAssignmentPolicy,
  SearchResult,
  AssignmentData
} from "~/types/user";
import type { PolicyData, Assignment } from "~/types/graph";

export interface UserAssignmentsLoadingState {
  stage: string;
  progress: number;
  details: string;
}

export const useUserSearch = () => {
  const { instance, accounts } = useMsal();
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string): Promise<GraphUser[]> => {
    if (!query || query.length < 2) return [];
    const account = accounts[0];
    if (!account) return [];
    setIsSearching(true);
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      return await searchUsers(response.accessToken, query);
    } finally {
      setIsSearching(false);
    }
  }, [accounts, instance]);

  return { search, isSearching };
};

export const useUserAssignments = () => {
  const { instance, accounts } = useMsal();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<GraphUser | null>(null);
  const [loadingState, setLoadingState] = useState<UserAssignmentsLoadingState>({
    stage: "Idle",
    progress: 0,
    details: ""
  });

  const getAccessToken = async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["userAssignments", selectedUser?.id],
    queryFn: async (): Promise<UserAssignmentData | null> => {
      if (!selectedUser) return null;

      setLoadingState({ stage: "Fetching Groups", progress: 10, details: "Getting user's group memberships..." });
      const token = await getAccessToken();

      // Fetch user's groups
      const userGroups = await getUserGroups(token, selectedUser.id);
      setLoadingState({ stage: "Fetching Policies", progress: 25, details: "Loading all Intune policies..." });

      // Check if policies are already cached
      const cachedPolicies = queryClient.getQueryData<PolicyData[]>(["intunePolicies"]);

      const allRawPolicies: { policy: unknown; type: PolicyData["type"]; assignments?: Assignment[] }[] = [];

      if (cachedPolicies) {
        setLoadingState({ stage: "Processing", progress: 70, details: "Using cached policy data..." });
        // We need raw policies with assignments, so we'll refetch
      }

      // Fetch all policies (we need the raw data with assignments)
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
        intents
      ] = await Promise.all([
        fetchDeviceConfigurations(token),
        fetchCompliancePolicies(token),
        fetchMobileApps(token),
        fetchScripts(token),
        fetchConfigurationPolicies(token),
        fetchAdminTemplates(token),
        fetchAppProtectionPolicies(token),
        fetchAppConfigurationPolicies(token),
        fetchProactiveRemediationScripts(token),
        fetchAutopilotProfiles(token),
        fetchESPProfiles(token),
        fetchCloudPCProvisioningPolicies(token),
        fetchCloudPCUserSettings(token),
        fetchDeviceManagementIntents(token)
      ]);

      setLoadingState({ stage: "Processing", progress: 70, details: "Processing policy assignments..." });

      const endpointSecurityCategories = {
        "endpointSecurityAntivirus": "Endpoint Security - Antivirus",
        "endpointSecurityDiskEncryption": "Endpoint Security - Disk Encryption",
        "endpointSecurityFirewall": "Endpoint Security - Firewall",
        "endpointSecurityEndpointDetectionAndResponse": "Endpoint Security - EDR",
        "endpointSecurityAttackSurfaceReductionRules": "Endpoint Security - ASR",
        "endpointSecurityEndpointPrivilegeManagement": "Endpoint Security - EPM"
      } as const;

      const addPolicy = (policy: unknown, type: PolicyData["type"], assignments?: Assignment[]) => {
        const policyObj = policy as { assignments?: Assignment[] };
        allRawPolicies.push({ policy, type, assignments: assignments ?? policyObj.assignments });
      };

      // Process policies
      configPolicies.forEach(p => {
        const templateFamily = (p as any).templateReference?.templateFamily;
        if (templateFamily && templateFamily in endpointSecurityCategories) {
          addPolicy(p, endpointSecurityCategories[templateFamily as keyof typeof endpointSecurityCategories] as PolicyData["type"]);
        } else {
          addPolicy(p, "Settings Catalog");
        }
      });

      intents.forEach(p => {
        const templateFamily = (p as any).templateReference?.templateFamily;
        if (templateFamily && templateFamily in endpointSecurityCategories) {
          addPolicy(p, endpointSecurityCategories[templateFamily as keyof typeof endpointSecurityCategories] as PolicyData["type"]);
        }
      });

      deviceConfigs.forEach(p => addPolicy(p, "Device Configuration"));
      compliancePolicies.forEach(p => addPolicy(p, "Compliance Policy"));
      apps.forEach(p => addPolicy(p, "Application"));
      scripts.forEach(p => addPolicy(p, "Script"));
      adminTemplates.forEach(p => addPolicy(p, "Administrative Template"));
      appProtectionPolicies.forEach(p => addPolicy(p, "App Protection Policy"));
      appConfigPolicies.forEach(p => addPolicy(p, "App Configuration Policy"));
      healthScripts.forEach(p => addPolicy(p, "Proactive Remediation Script"));
      autopilotProfiles.forEach(p => addPolicy(p, "Autopilot Profile"));
      espProfiles
        .filter((p: any) => p["@odata.type"]?.includes("EnrollmentCompletionPageConfiguration"))
        .forEach(p => addPolicy(p, "Enrollment Status Page"));
      cloudPCProvisioning.forEach(p => addPolicy(p, "Cloud PC Provisioning Policy"));
      cloudPCUserSettings.forEach(p => addPolicy(p, "Cloud PC User Setting"));

      setLoadingState({ stage: "Matching", progress: 85, details: "Finding policies assigned to user..." });

      // Create a set of user's group IDs for quick lookup
      const userGroupIds = new Set(userGroups.map(g => g.id));
      const groupIdToName = new Map(userGroups.map(g => [g.id, g.displayName]));

      // Group policies by how they're assigned to this user
      const allUsersPolicies: UserAssignmentPolicy[] = [];
      const groupPoliciesMap = new Map<string, UserAssignmentPolicy[]>();

      // Helper type for accessing policy properties
      type PolicyLike = {
        id: string;
        displayName?: string;
        name?: string;
        description?: string;
        lastModifiedDateTime?: string;
        "@odata.type"?: string;
        templateReference?: {
          templateId?: string;
          templateDisplayName?: string;
        };
        technologies?: string;
        platforms?: string;
      };

      // Helper to extract platform from @odata.type
      const getPlatform = (odataType?: string): string | undefined => {
        if (!odataType) return undefined;
        const lower = odataType.toLowerCase();
        if (lower.includes("windows")) return "Windows";
        if (lower.includes("macos") || lower.includes("mac")) return "macOS";
        if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) return "iOS/iPadOS";
        if (lower.includes("android")) return "Android";
        if (lower.includes("linux")) return "Linux";
        return undefined;
      };

      allRawPolicies.forEach(item => {
        const { policy: rawPolicy, type, assignments } = item;
        const policy = rawPolicy as PolicyLike;
        const policyAssignments = assignments ?? [];

        // Extract extended policy info
        const odataType = policy["@odata.type"];
        const platform = getPlatform(odataType);
        const templateId = policy.templateReference?.templateId;
        const templateDisplayName = policy.templateReference?.templateDisplayName;
        const technologies = policy.technologies;
        const platforms = policy.platforms;

        // Common policy data
        const basePolicyData = {
          id: policy.id,
          name: policy.displayName ?? policy.name ?? "Unknown",
          type,
          description: policy.description,
          lastModifiedDateTime: policy.lastModifiedDateTime,
          odataType,
          platform,
          templateId,
          templateDisplayName,
          technologies,
          platforms,
        };

        policyAssignments.forEach(assignment => {
          const targetType = assignment.target["@odata.type"];
          const intent = assignment.intent ?? "required";

          // Check if assigned to All Users
          if (targetType.includes("allLicensedUsersAssignmentTarget")) {
            allUsersPolicies.push({
              ...basePolicyData,
              assignmentIntent: intent === "required" ? "required" : "available",
              inheritedVia: "All Users"
            });
          }

          // Check if assigned to one of user's groups
          if (targetType.includes("groupAssignmentTarget") && assignment.target.groupId) {
            const groupId = assignment.target.groupId;
            if (userGroupIds.has(groupId)) {
              const groupName = groupIdToName.get(groupId) ?? groupId;
              if (!groupPoliciesMap.has(groupId)) {
                groupPoliciesMap.set(groupId, []);
              }
              groupPoliciesMap.get(groupId)!.push({
                ...basePolicyData,
                assignmentIntent: intent === "required" ? "required" : "available",
                inheritedVia: groupName,
                groupId
              });
            }
          }

          // Check exclusions (mark as excluded if user is in excluded group)
          if (targetType.includes("exclusionGroupAssignmentTarget") && assignment.target.groupId) {
            const groupId = assignment.target.groupId;
            if (userGroupIds.has(groupId)) {
              const groupName = groupIdToName.get(groupId) ?? groupId;
              if (!groupPoliciesMap.has(groupId)) {
                groupPoliciesMap.set(groupId, []);
              }
              groupPoliciesMap.get(groupId)!.push({
                ...basePolicyData,
                assignmentIntent: "excluded",
                inheritedVia: groupName,
                groupId
              });
            }
          }
        });
      });

      setLoadingState({ stage: "Finalizing", progress: 95, details: "Building visualization data..." });

      // Build the final structure
      const assignments: GroupWithPolicies[] = [];

      // Add "All Users" if there are policies
      if (allUsersPolicies.length > 0) {
        assignments.push({
          group: { id: "all-users", displayName: "All Users" },
          policies: allUsersPolicies
        });
      }

      // Add each group with its policies
      userGroups.forEach(group => {
        const policies = groupPoliciesMap.get(group.id) ?? [];
        if (policies.length > 0) {
          assignments.push({
            group,
            policies
          });
        }
      });

      // Count total unique policies
      const uniquePolicyIds = new Set<string>();
      assignments.forEach(a => a.policies.forEach(p => uniquePolicyIds.add(p.id)));

      setLoadingState({ stage: "Complete", progress: 100, details: "Done!" });

      return {
        user: selectedUser,
        groups: userGroups,
        assignments,
        totalPolicies: uniquePolicyIds.size
      };
    },
    enabled: !!selectedUser && accounts.length > 0,
  });

  const selectUser = useCallback((user: GraphUser | null) => {
    setSelectedUser(user);
    if (user) {
      setLoadingState({ stage: "Starting", progress: 5, details: "Preparing to load assignments..." });
    } else {
      setLoadingState({ stage: "Idle", progress: 0, details: "" });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedUser(null);
    setLoadingState({ stage: "Idle", progress: 0, details: "" });
  }, []);

  return {
    selectedUser,
    selectUser,
    clearSelection,
    data,
    isLoading,
    error,
    loadingState,
    refetch
  };
};

// Unified search for both users and devices
export const useUnifiedSearch = () => {
  const { instance, accounts } = useMsal();
  const [isSearching, setIsSearching] = useState(false);

  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query || query.length < 2) return [];
    const account = accounts[0];
    if (!account) return [];
    setIsSearching(true);
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: account,
      });
      return await searchAll(response.accessToken, query);
    } finally {
      setIsSearching(false);
    }
  }, [accounts, instance]);

  return { search, isSearching };
};

// Unified assignments hook that works with both users and devices
export const useAssignments = () => {
  const { instance, accounts } = useMsal();
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [loadingState, setLoadingState] = useState<UserAssignmentsLoadingState>({
    stage: "Idle",
    progress: 0,
    details: ""
  });

  const getAccessToken = async () => {
    const account = accounts[0];
    if (!account) throw new Error("No active account");
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account,
    });
    return response.accessToken;
  };

  // Shared policy fetching logic
  const fetchAllPolicies = async (token: string) => {
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
      intents
    ] = await Promise.all([
      fetchDeviceConfigurations(token),
      fetchCompliancePolicies(token),
      fetchMobileApps(token),
      fetchScripts(token),
      fetchConfigurationPolicies(token),
      fetchAdminTemplates(token),
      fetchAppProtectionPolicies(token),
      fetchAppConfigurationPolicies(token),
      fetchProactiveRemediationScripts(token),
      fetchAutopilotProfiles(token),
      fetchESPProfiles(token),
      fetchCloudPCProvisioningPolicies(token),
      fetchCloudPCUserSettings(token),
      fetchDeviceManagementIntents(token)
    ]);

    return {
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
      intents
    };
  };

  // Process policies into assignment structure
  const processPolicies = (
    policies: Awaited<ReturnType<typeof fetchAllPolicies>>,
    groupIds: Set<string>,
    groupIdToName: Map<string, string>,
    isDevice: boolean
  ) => {
    const allRawPolicies: { policy: unknown; type: PolicyData["type"]; assignments?: Assignment[] }[] = [];

    const endpointSecurityCategories = {
      "endpointSecurityAntivirus": "Endpoint Security - Antivirus",
      "endpointSecurityDiskEncryption": "Endpoint Security - Disk Encryption",
      "endpointSecurityFirewall": "Endpoint Security - Firewall",
      "endpointSecurityEndpointDetectionAndResponse": "Endpoint Security - EDR",
      "endpointSecurityAttackSurfaceReductionRules": "Endpoint Security - ASR",
      "endpointSecurityEndpointPrivilegeManagement": "Endpoint Security - EPM"
    } as const;

    const addPolicy = (policy: unknown, type: PolicyData["type"], assignments?: Assignment[]) => {
      const policyObj = policy as { assignments?: Assignment[] };
      allRawPolicies.push({ policy, type, assignments: assignments ?? policyObj.assignments });
    };

    // Process policies
    policies.configPolicies.forEach(p => {
      const templateFamily = (p as any).templateReference?.templateFamily;
      if (templateFamily && templateFamily in endpointSecurityCategories) {
        addPolicy(p, endpointSecurityCategories[templateFamily as keyof typeof endpointSecurityCategories] as PolicyData["type"]);
      } else {
        addPolicy(p, "Settings Catalog");
      }
    });

    policies.intents.forEach(p => {
      const templateFamily = (p as any).templateReference?.templateFamily;
      if (templateFamily && templateFamily in endpointSecurityCategories) {
        addPolicy(p, endpointSecurityCategories[templateFamily as keyof typeof endpointSecurityCategories] as PolicyData["type"]);
      }
    });

    policies.deviceConfigs.forEach(p => addPolicy(p, "Device Configuration"));
    policies.compliancePolicies.forEach(p => addPolicy(p, "Compliance Policy"));
    policies.apps.forEach(p => addPolicy(p, "Application"));
    policies.scripts.forEach(p => addPolicy(p, "Script"));
    policies.adminTemplates.forEach(p => addPolicy(p, "Administrative Template"));
    policies.appProtectionPolicies.forEach(p => addPolicy(p, "App Protection Policy"));
    policies.appConfigPolicies.forEach(p => addPolicy(p, "App Configuration Policy"));
    policies.healthScripts.forEach(p => addPolicy(p, "Proactive Remediation Script"));
    policies.autopilotProfiles.forEach(p => addPolicy(p, "Autopilot Profile"));
    policies.espProfiles
      .filter((p: any) => p["@odata.type"]?.includes("EnrollmentCompletionPageConfiguration"))
      .forEach(p => addPolicy(p, "Enrollment Status Page"));
    policies.cloudPCProvisioning.forEach(p => addPolicy(p, "Cloud PC Provisioning Policy"));
    policies.cloudPCUserSettings.forEach(p => addPolicy(p, "Cloud PC User Setting"));

    // Group policies by how they're assigned
    const allTargetPolicies: UserAssignmentPolicy[] = [];
    const groupPoliciesMap = new Map<string, UserAssignmentPolicy[]>();

    // Extended policy type to capture all relevant fields
    type PolicyLike = {
      id: string;
      displayName?: string;
      name?: string;
      description?: string;
      lastModifiedDateTime?: string;
      "@odata.type"?: string;
      templateReference?: {
        templateId?: string;
        templateDisplayName?: string;
      };
      technologies?: string;
      platforms?: string;
    };

    // Helper to extract platform from @odata.type
    const getPlatform = (odataType?: string): string | undefined => {
      if (!odataType) return undefined;
      const lower = odataType.toLowerCase();
      if (lower.includes("windows")) return "Windows";
      if (lower.includes("macos") || lower.includes("mac")) return "macOS";
      if (lower.includes("ios") || lower.includes("iphone") || lower.includes("ipad")) return "iOS/iPadOS";
      if (lower.includes("android")) return "Android";
      if (lower.includes("linux")) return "Linux";
      return undefined;
    };

    allRawPolicies.forEach(item => {
      const { policy: rawPolicy, type, assignments } = item;
      const policy = rawPolicy as PolicyLike;
      const policyAssignments = assignments ?? [];

      // Extract extended policy info
      const odataType = policy["@odata.type"];
      const platform = getPlatform(odataType);
      const templateId = policy.templateReference?.templateId;
      const templateDisplayName = policy.templateReference?.templateDisplayName;
      const technologies = policy.technologies;
      const platforms = policy.platforms;

      policyAssignments.forEach(assignment => {
        const targetType = assignment.target["@odata.type"];
        const intent = assignment.intent ?? "required";

        // Common policy data
        const basePolicyData = {
          id: policy.id,
          name: policy.displayName ?? policy.name ?? "Unknown",
          type,
          description: policy.description,
          lastModifiedDateTime: policy.lastModifiedDateTime,
          odataType,
          platform,
          templateId,
          templateDisplayName,
          technologies,
          platforms,
        };

        // For users: Check if assigned to All Users
        // For devices: Check if assigned to All Devices
        const allUsersTarget = targetType.includes("allLicensedUsersAssignmentTarget");
        const allDevicesTarget = targetType.includes("allDevicesAssignmentTarget");

        if ((isDevice && allDevicesTarget) || (!isDevice && allUsersTarget)) {
          allTargetPolicies.push({
            ...basePolicyData,
            assignmentIntent: intent === "required" ? "required" : "available",
            inheritedVia: isDevice ? "All Devices" : "All Users"
          });
        }

        // Check if assigned to one of the groups
        if (targetType.includes("groupAssignmentTarget") && assignment.target.groupId) {
          const groupId = assignment.target.groupId;
          if (groupIds.has(groupId)) {
            const groupName = groupIdToName.get(groupId) ?? groupId;
            if (!groupPoliciesMap.has(groupId)) {
              groupPoliciesMap.set(groupId, []);
            }
            groupPoliciesMap.get(groupId)!.push({
              ...basePolicyData,
              assignmentIntent: intent === "required" ? "required" : "available",
              inheritedVia: groupName,
              groupId
            });
          }
        }

        // Check exclusions
        if (targetType.includes("exclusionGroupAssignmentTarget") && assignment.target.groupId) {
          const groupId = assignment.target.groupId;
          if (groupIds.has(groupId)) {
            const groupName = groupIdToName.get(groupId) ?? groupId;
            if (!groupPoliciesMap.has(groupId)) {
              groupPoliciesMap.set(groupId, []);
            }
            groupPoliciesMap.get(groupId)!.push({
              ...basePolicyData,
              assignmentIntent: "excluded",
              inheritedVia: groupName,
              groupId
            });
          }
        }
      });
    });

    return { allTargetPolicies, groupPoliciesMap };
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["assignments", selectedItem?.type, selectedItem?.data.id],
    queryFn: async (): Promise<AssignmentData | null> => {
      if (!selectedItem) return null;

      const token = await getAccessToken();
      const isDevice = selectedItem.type === "device";
      const itemId = selectedItem.data.id;

      setLoadingState({ stage: "Fetching Groups", progress: 10, details: `Getting ${isDevice ? "device" : "user"}'s group memberships...` });

      // Fetch groups based on type
      const groups = isDevice
        ? await getDeviceGroups(token, itemId)
        : await getUserGroups(token, itemId);

      setLoadingState({ stage: "Fetching Policies", progress: 25, details: "Loading all Intune policies..." });

      const allPolicies = await fetchAllPolicies(token);

      setLoadingState({ stage: "Processing", progress: 70, details: "Processing policy assignments..." });

      const groupIds = new Set(groups.map(g => g.id));
      const groupIdToName = new Map(groups.map(g => [g.id, g.displayName]));

      const { allTargetPolicies, groupPoliciesMap } = processPolicies(allPolicies, groupIds, groupIdToName, isDevice);

      setLoadingState({ stage: "Matching", progress: 85, details: `Finding policies assigned to ${isDevice ? "device" : "user"}...` });

      // Build the final structure
      const assignments: GroupWithPolicies[] = [];

      // Add "All Users" or "All Devices" if there are policies
      if (allTargetPolicies.length > 0) {
        assignments.push({
          group: { id: isDevice ? "all-devices" : "all-users", displayName: isDevice ? "All Devices" : "All Users" },
          policies: allTargetPolicies
        });
      }

      // Add each group with its policies
      groups.forEach(group => {
        const policies = groupPoliciesMap.get(group.id) ?? [];
        if (policies.length > 0) {
          assignments.push({
            group,
            policies
          });
        }
      });

      // Count total unique policies
      const uniquePolicyIds = new Set<string>();
      assignments.forEach(a => a.policies.forEach(p => uniquePolicyIds.add(p.id)));

      setLoadingState({ stage: "Complete", progress: 100, details: "Done!" });

      if (isDevice) {
        return {
          type: "device",
          data: {
            device: selectedItem.data as GraphDevice,
            groups,
            assignments,
            totalPolicies: uniquePolicyIds.size
          }
        };
      } else {
        return {
          type: "user",
          data: {
            user: selectedItem.data as GraphUser,
            groups,
            assignments,
            totalPolicies: uniquePolicyIds.size
          }
        };
      }
    },
    enabled: !!selectedItem && accounts.length > 0,
  });

  const selectItem = useCallback((item: SearchResult | null) => {
    setSelectedItem(item);
    if (item) {
      setLoadingState({ stage: "Starting", progress: 5, details: "Preparing to load assignments..." });
    } else {
      setLoadingState({ stage: "Idle", progress: 0, details: "" });
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItem(null);
    setLoadingState({ stage: "Idle", progress: 0, details: "" });
  }, []);

  return {
    selectedItem,
    selectItem,
    clearSelection,
    data,
    isLoading,
    error,
    loadingState,
    refetch,
    getAccessToken
  };
};
