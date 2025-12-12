import { Client } from "@microsoft/microsoft-graph-client";
import type {
  DeviceConfiguration,
  DeviceCompliancePolicy,
  MobileApp,
  DeviceManagementScript,
  ConfigurationPolicy,
  GroupPolicyConfiguration,
  ManagedAppPolicy,
  MobileAppConfiguration,
  DeviceHealthScript,
  WindowsAutopilotDeploymentProfile,
  DeviceEnrollmentConfiguration,
  CloudPCProvisioningPolicy,
  CloudPCUserSetting,
  DeviceManagementIntent,
  GraphResponse,
} from "~/types/graph";
import type {
  GraphUser,
  GraphDevice,
  UserGroupMembership,
  GraphGroup,
  SearchResult,
} from "~/types/user";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second

// Helper for sleeping
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Robust fetch with retry logic
const fetchWithRetry = async <T>(
  client: Client,
  request: any,
  endpoint: string,
): Promise<GraphResponse<T>> => {
  let retries = 0;

  while (true) {
    try {
      return await request.get();
    } catch (error: any) {
      retries++;

      // Check if we should retry
      const isRateLimit = error?.statusCode === 429;
      const isServerSide = error?.statusCode >= 500 && error?.statusCode < 600;

      if ((isRateLimit || isServerSide) && retries <= MAX_RETRIES) {
        const delay =
          RETRY_DELAY_BASE * Math.pow(2, retries - 1) + Math.random() * 500; // Exponential backoff with jitter
        console.warn(
          `Request to ${endpoint} failed (${error.statusCode}). Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${MAX_RETRIES})`,
        );
        await sleep(delay);
        continue;
      }

      // If we're out of retries or it's a non-retriable error, throw
      throw error;
    }
  }
};

export const getGraphClient = (accessToken: string) => {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
};

// Generic fetcher for beta entities
const fetchBetaEntities = async <T>(
  accessToken: string,
  endpoint: string,
  expandAssignments = true,
  silentOn403 = false,
): Promise<T[]> => {
  const client = getGraphClient(accessToken);
  let request = client.api(endpoint).version("beta");

  if (expandAssignments) {
    request = request.expand("assignments");
  }

  try {
    const response = await fetchWithRetry<T>(client, request, endpoint);
    let values = response.value || [];

    // Handle pagination
    let nextLink = response["@odata.nextLink"];
    while (nextLink) {
      try {
        const nextRequest = client.api(nextLink);
        const nextResponse = await fetchWithRetry<T>(
          client,
          nextRequest,
          nextLink,
        );
        values = values.concat(nextResponse.value || []);
        nextLink = nextResponse["@odata.nextLink"];
      } catch (e) {
        console.warn(
          `Pagination failed for ${endpoint} at link ${nextLink}`,
          e,
        );
        break; // Stop pagination on failure but return what we have
      }
    }

    return values;
  } catch (e: any) {
    const is403 =
      e?.statusCode === 403 || e?.code === "Authorization_RequestDenied";
    if (silentOn403 && is403) {
      return [];
    }
    console.error(`Failed to fetch entities from ${endpoint} after retries`, e);
    throw e;
  }
};

export const fetchDeviceConfigurations = (token: string) =>
  fetchBetaEntities<DeviceConfiguration>(
    token,
    "/deviceManagement/deviceConfigurations",
  );

export const fetchCompliancePolicies = (token: string) =>
  fetchBetaEntities<DeviceCompliancePolicy>(
    token,
    "/deviceManagement/deviceCompliancePolicies",
  );

// Fetch mobile apps with their assignments (fetched separately since expand fails)
export const fetchMobileApps = async (token: string): Promise<MobileApp[]> => {
  const client = getGraphClient(token);

  try {
    // First fetch all assigned apps
    const request = client
      .api("/deviceAppManagement/mobileApps")
      .version("beta")
      .filter("isAssigned eq true")
      .select("id,displayName,description,lastModifiedDateTime");

    const response = await fetchWithRetry<MobileApp>(
      client,
      request,
      "/deviceAppManagement/mobileApps",
    );
    let apps = response.value || [];

    // Handle pagination
    let nextLink = response["@odata.nextLink"];
    while (nextLink) {
      const nextRequest = client.api(nextLink);
      const nextResponse = await fetchWithRetry<MobileApp>(
        client,
        nextRequest,
        nextLink,
      );
      apps = apps.concat(nextResponse.value || []);
      nextLink = nextResponse["@odata.nextLink"];
    }

    // Fetch assignments for each app (in batches to avoid rate limiting)
    const batchSize = 10; // Reduced batch size for safety
    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (app: any) => {
          try {
            const assignmentsRequest = client
              .api(`/deviceAppManagement/mobileApps('${app.id}')/assignments`)
              .version("beta");

            // We don't use full retry logic here to speed things up, but we catch errors individually
            const assignmentsResponse = await assignmentsRequest.get();
            app.assignments = assignmentsResponse.value || [];
          } catch (e) {
            console.warn(`Failed to fetch assignments for app ${app.id}`, e);
            app.assignments = [];
          }
        }),
      );
      await sleep(200); // Small delay between batches
    }

    return apps as MobileApp[];
  } catch (e) {
    console.warn("Failed to fetch mobile apps", e);
    throw e;
  }
};

export const fetchScripts = (token: string) =>
  fetchBetaEntities<DeviceManagementScript>(
    token,
    "/deviceManagement/deviceManagementScripts",
  );

export const fetchConfigurationPolicies = (token: string) =>
  fetchBetaEntities<ConfigurationPolicy>(
    token,
    "/deviceManagement/configurationPolicies",
  );

export const fetchAdminTemplates = (token: string) =>
  fetchBetaEntities<GroupPolicyConfiguration>(
    token,
    "/deviceManagement/groupPolicyConfigurations",
  );

// Fetch App Protection Policies with their assignments
export const fetchAppProtectionPolicies = async (
  token: string,
): Promise<ManagedAppPolicy[]> => {
  const allPolicies: ManagedAppPolicy[] = [];

  // Fetch from all three specific endpoints that support assignments
  const endpoints = [
    "/deviceAppManagement/androidManagedAppProtections",
    "/deviceAppManagement/iosManagedAppProtections",
    "/deviceAppManagement/windowsManagedAppProtections",
  ];

  // Use sequential execution or limited concurrency here to be safe
  for (const endpoint of endpoints) {
    try {
      const policies = await fetchBetaEntities<ManagedAppPolicy>(
        token,
        endpoint,
        true,
      );
      allPolicies.push(...policies);
    } catch (e) {
      console.warn(`Failed to fetch policies from ${endpoint}`, e);
      // Continue to next endpoint even if one fails
    }
  }

  return allPolicies;
};

export const fetchAppConfigurationPolicies = (token: string) =>
  fetchBetaEntities<MobileAppConfiguration>(
    token,
    "/deviceAppManagement/mobileAppConfigurations",
  );

export const fetchProactiveRemediationScripts = (token: string) =>
  fetchBetaEntities<DeviceHealthScript>(
    token,
    "/deviceManagement/deviceHealthScripts",
  );

export const fetchAutopilotProfiles = (token: string) =>
  fetchBetaEntities<WindowsAutopilotDeploymentProfile>(
    token,
    "/deviceManagement/windowsAutopilotDeploymentProfiles",
  );

export const fetchESPProfiles = (token: string) =>
  fetchBetaEntities<DeviceEnrollmentConfiguration>(
    token,
    "/deviceManagement/deviceEnrollmentConfigurations",
  );

export const fetchCloudPCProvisioningPolicies = (token: string) =>
  fetchBetaEntities<CloudPCProvisioningPolicy>(
    token,
    "/deviceManagement/virtualEndpoint/provisioningPolicies",
    true,
    true,
  );

export const fetchCloudPCUserSettings = (token: string) =>
  fetchBetaEntities<CloudPCUserSetting>(
    token,
    "/deviceManagement/virtualEndpoint/userSettings",
    true,
    true,
  );

export const fetchDeviceManagementIntents = (token: string) =>
  fetchBetaEntities<DeviceManagementIntent>(token, "/deviceManagement/intents");

// Helper to fetch assignments for an entity if expansion failed or wasn't used
export const fetchAssignmentsForEntity = async (
  accessToken: string,
  endpoint: string,
): Promise<any[]> => {
  const client = getGraphClient(accessToken);
  try {
    const request = client.api(`${endpoint}/assignments`).version("beta");
    const response = await fetchWithRetry(
      client,
      request,
      `${endpoint}/assignments`,
    );
    return (response.value || []) as any[];
  } catch (e) {
    console.warn(`Failed to fetch assignments for ${endpoint}`, e);
    return [];
  }
};

export const fetchGroup = async (accessToken: string, groupId: string) => {
  const client = getGraphClient(accessToken);
  try {
    const request = client.api(`/groups/${groupId}`).select("displayName");
    const group = await fetchWithRetry<any>(
      client,
      request,
      `/groups/${groupId}`,
    );
    return (group as any).displayName;
  } catch {
    return "Unknown Group";
  }
};

export const resolveGroupIds = async (
  accessToken: string,
  groupIds: string[],
): Promise<Record<string, string>> => {
  if (groupIds.length === 0) return {};

  const client = getGraphClient(accessToken);
  const uniqueIds = Array.from(new Set(groupIds));

  // Batch in chunks of 1000 (limit for directoryObjects/getByIds)
  const chunkSize = 1000;
  const resultMap: Record<string, string> = {};

  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    try {
      const response = await client.api("/directoryObjects/getByIds").post({
        ids: chunk,
        types: ["group"],
      });

      (response.value || []).forEach((obj: any) => {
        if (obj.id && obj.displayName) {
          resultMap[obj.id] = obj.displayName;
        }
      });
    } catch (e) {
      console.error("Error resolving group IDs", e);
    }
  }

  return resultMap;
};

// Search users by display name, email, or UPN
export const searchUsers = async (
  accessToken: string,
  query: string,
): Promise<GraphUser[]> => {
  if (!query || query.length < 2) return [];

  const client = getGraphClient(accessToken);

  try {
    // Use filter with startsWith for better results
    const request = client
      .api("/users")
      .filter(
        `startsWith(displayName,'${query}') or startsWith(mail,'${query}') or startsWith(userPrincipalName,'${query}')`,
      )
      .select("id,displayName,mail,userPrincipalName,jobTitle,department")
      .top(10);

    const response = await fetchWithRetry<GraphUser>(client, request, "/users");
    return response.value || [];
  } catch (e) {
    console.error("Error searching users", e);
    return [];
  }
};

// Get user's group memberships (transitive - includes nested groups)
export const getUserGroups = async (
  accessToken: string,
  userId: string,
): Promise<UserGroupMembership[]> => {
  const client = getGraphClient(accessToken);

  try {
    // Use transitiveMemberOf to get all groups including nested ones
    const request = client
      .api(`/users/${userId}/transitiveMemberOf`)
      .select("id,displayName");

    const response = await fetchWithRetry<any>(
      client,
      request,
      `/users/${userId}/transitiveMemberOf`,
    );

    // Filter to only include groups (not roles, etc.)
    const groups = (response.value || [])
      .filter((item: any) => item["@odata.type"] === "#microsoft.graph.group")
      .map((group: any) => ({
        id: group.id,
        displayName: group.displayName,
      }));

    return groups as UserGroupMembership[];
  } catch (e) {
    console.error("Error fetching user groups", e);
    return [];
  }
};

// Get a single user by ID
export const getUser = async (
  accessToken: string,
  userId: string,
): Promise<GraphUser | null> => {
  const client = getGraphClient(accessToken);

  try {
    const request = client
      .api(`/users/${userId}`)
      .select("id,displayName,mail,userPrincipalName,jobTitle,department");

    const user = await fetchWithRetry<GraphUser>(
      client,
      request,
      `/users/${userId}`,
    );
    return user as any;
  } catch (e) {
    console.error("Error fetching user", e);
    return null;
  }
};

// Search devices by display name, serial number, or device ID
export const searchDevices = async (
  accessToken: string,
  query: string,
): Promise<GraphDevice[]> => {
  if (!query || query.length < 2) return [];

  const client = getGraphClient(accessToken);
  const lowerQuery = query.toLowerCase();
  const matchedDevices: GraphDevice[] = [];

  try {
    // Search managed devices in Intune
    const request = client
      .api("/deviceManagement/managedDevices")
      .version("beta")
      .select(
        "id,deviceName,serialNumber,operatingSystem,osVersion,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,userPrincipalName",
      )
      .top(200);

    let response = await fetchWithRetry<any>(
      client,
      request,
      "/deviceManagement/managedDevices",
    );

    // Process initial page
    const processDevices = (devices: any[]) => {
      for (const device of devices) {
        if (matchedDevices.length >= 10) return; // Stop once we have 10 matches

        const deviceName = (device.deviceName || "").toLowerCase();
        const serialNumber = (device.serialNumber || "").toLowerCase();

        if (
          deviceName.includes(lowerQuery) ||
          serialNumber.includes(lowerQuery)
        ) {
          matchedDevices.push({
            id: device.id,
            displayName: device.deviceName,
            deviceId: device.id,
            serialNumber: device.serialNumber,
            operatingSystem: device.operatingSystem,
            osVersion: device.osVersion,
            managementType: device.managedDeviceOwnerType,
            enrolledDateTime: device.enrolledDateTime,
            lastSyncDateTime: device.lastSyncDateTime,
            userPrincipalName: device.userPrincipalName,
          });
        }
      }
    };

    processDevices(response.value || []);

    // Continue with pagination until we have 10 matches or no more pages
    let nextLink = response["@odata.nextLink"];
    while (nextLink && matchedDevices.length < 10) {
      const nextRequest = client.api(nextLink);
      response = await fetchWithRetry<any>(client, nextRequest, nextLink);
      processDevices(response.value || []);
      nextLink = response["@odata.nextLink"];
    }

    return matchedDevices;
  } catch (e) {
    console.error("Error searching devices", e);
    return [];
  }
};

const escapeODataString = (value: string) => value.replaceAll("'", "''");

export const searchGroups = async (
  accessToken: string,
  query: string,
): Promise<GraphGroup[]> => {
  if (!query || query.length < 2) return [];

  const client = getGraphClient(accessToken);
  const safeQuery = escapeODataString(query);

  try {
    const request = client
      .api("/groups")
      .filter(`startsWith(displayName,'${safeQuery}')`)
      .select("id,displayName,description")
      .top(10);

    const response = await fetchWithRetry<any>(client, request, "/groups");
    return (response.value || []).map((g: any) => ({
      id: g.id,
      displayName: g.displayName,
      description: g.description,
      "@odata.type": g["@odata.type"],
    })) as GraphGroup[];
  } catch (e) {
    console.error("Error searching groups", e);
    return [];
  }
};

// Get device's group memberships (transitive - includes nested groups, via Azure AD device object)
export const getDeviceGroups = async (
  accessToken: string,
  deviceId: string,
): Promise<UserGroupMembership[]> => {
  const client = getGraphClient(accessToken);

  try {
    // First get the Azure AD device ID from the managed device
    const managedDeviceRequest = client
      .api(`/deviceManagement/managedDevices/${deviceId}`)
      .version("beta")
      .select("azureADDeviceId");

    const managedDevice = await fetchWithRetry<any>(
      client,
      managedDeviceRequest,
      `/deviceManagement/managedDevices/${deviceId}`,
    );

    const azureAdDeviceId = (managedDevice as any).azureADDeviceId;
    if (!azureAdDeviceId) {
      console.warn("Device has no Azure AD device ID");
      return [];
    }

    // Get transitive group memberships for the Azure AD device (includes nested groups)
    const groupsRequest = client
      .api(`/devices(deviceId='${azureAdDeviceId}')/transitiveMemberOf`)
      .select("id,displayName");

    const response = await fetchWithRetry<any>(
      client,
      groupsRequest,
      `/devices/${azureAdDeviceId}/transitiveMemberOf`,
    );

    // Filter to only include groups
    const groups = (response.value || [])
      .filter((item: any) => item["@odata.type"] === "#microsoft.graph.group")
      .map((group: any) => ({
        id: group.id,
        displayName: group.displayName,
      }));

    return groups as UserGroupMembership[];
  } catch (e) {
    console.error("Error fetching device groups", e);
    return [];
  }
};

// API response type for managed device
interface ManagedDeviceResponse {
  id: string;
  deviceName?: string;
  serialNumber?: string;
  operatingSystem?: string;
  osVersion?: string;
  managedDeviceOwnerType?: string;
  enrolledDateTime?: string;
  lastSyncDateTime?: string;
  userPrincipalName?: string;
}

// Get a single device by ID
export const getDevice = async (
  accessToken: string,
  deviceId: string,
): Promise<GraphDevice | null> => {
  const client = getGraphClient(accessToken);

  try {
    const request = client
      .api(`/deviceManagement/managedDevices/${deviceId}`)
      .version("beta")
      .select(
        "id,deviceName,serialNumber,operatingSystem,osVersion,managedDeviceOwnerType,enrolledDateTime,lastSyncDateTime,userPrincipalName",
      );

    const device = (await fetchWithRetry<ManagedDeviceResponse>(
      client,
      request,
      `/deviceManagement/managedDevices/${deviceId}`,
    )) as unknown as ManagedDeviceResponse;

    return {
      id: device.id,
      displayName: device.deviceName ?? device.id,
      deviceId: device.id,
      serialNumber: device.serialNumber,
      operatingSystem: device.operatingSystem,
      osVersion: device.osVersion,
      managementType: device.managedDeviceOwnerType,
      enrolledDateTime: device.enrolledDateTime,
      lastSyncDateTime: device.lastSyncDateTime,
      userPrincipalName: device.userPrincipalName,
    };
  } catch (e) {
    console.error("Error fetching device", e);
    return null;
  }
};

// Unified search for both users and devices
export const searchAll = async (
  accessToken: string,
  query: string,
): Promise<SearchResult[]> => {
  if (!query || query.length < 2) return [];

  // Search both in parallel
  const [users, devices] = await Promise.all([
    searchUsers(accessToken, query),
    searchDevices(accessToken, query),
  ]);

  // Combine results with type tags
  const results: SearchResult[] = [
    ...users.map((user) => ({ type: "user" as const, data: user })),
    ...devices.map((device) => ({ type: "device" as const, data: device })),
  ];

  return results;
};
