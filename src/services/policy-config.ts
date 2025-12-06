import { getGraphClient } from "./graph";
import type { PolicyData } from "~/types/graph";

export interface PolicyConfigItem {
  name: string;
  value: string | boolean | number | null;
}

// Fields to skip when normalizing policy responses
const SKIP_FIELDS = new Set([
  "id",
  "@odata.type",
  "@odata.context",
  "version",
  "createdDateTime",
  "lastModifiedDateTime",
  "displayName",
  "description",
  "assignments",
  "roleScopeTagIds",
  "supportsScopeTags",
  "deviceManagementApplicabilityRuleOsEdition",
  "deviceManagementApplicabilityRuleOsVersion",
  "deviceManagementApplicabilityRuleDeviceMode",
]);

// Convert camelCase to readable format
function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Check if a string looks like base64-encoded content
function isLikelyBase64(str: string): boolean {
  // Must be at least 20 chars to be meaningful base64
  if (str.length < 20) return false;

  // Base64 strings have length that's a multiple of 4
  if (str.length % 4 !== 0) return false;

  // Check if it matches base64 pattern (A-Z, a-z, 0-9, +, /, =)
  const base64Regex = /^[A-Za-z0-9+/]+=*$/;
  if (!base64Regex.test(str)) return false;

  // Avoid false positives: skip if it looks like a normal word/sentence
  // (base64 typically has mixed case and numbers throughout)
  const hasNumbers = /\d/.test(str);
  const hasMixedCase = /[a-z]/.test(str) && /[A-Z]/.test(str);

  return hasNumbers && hasMixedCase;
}

// Try to decode base64, return original if it fails or doesn't look like text
function tryDecodeBase64(str: string): string {
  if (!isLikelyBase64(str)) return str;

  try {
    const decoded = atob(str);

    // Check if the decoded content looks like readable text
    // (should be mostly printable ASCII characters)
    const printableRatio = decoded.split("").filter(c => {
      const code = c.charCodeAt(0);
      // Printable ASCII: space (32) to tilde (126), plus common whitespace
      return (code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13;
    }).length / decoded.length;

    // If more than 80% is printable, it's likely text
    if (printableRatio > 0.8) {
      // Truncate if too long
      const maxLength = 500;
      if (decoded.length > maxLength) {
        return decoded.substring(0, maxLength) + "...";
      }
      return decoded;
    }

    // Not readable text, return original
    return str;
  } catch {
    // Decode failed, return original
    return str;
  }
}

// Format a value for display
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "Not configured";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    // Try to decode if it looks like base64
    return tryDecodeBase64(value);
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    // For arrays of objects, try to extract meaningful info
    if (typeof value[0] === "object") {
      return `${value.length} item(s)`;
    }
    return value.map(v => typeof v === "string" ? tryDecodeBase64(v) : String(v)).join(", ");
  }
  if (typeof value === "object") {
    // For nested objects, stringify them nicely
    const entries = Object.entries(value).filter(([k]) => !k.startsWith("@"));
    if (entries.length === 0) return "{}";
    return entries.map(([k, v]) => `${formatFieldName(k)}: ${formatValue(v)}`).join("; ");
  }
  // Fallback for any other type (functions, symbols, etc.)
  return typeof value === "function" ? "[Function]" : JSON.stringify(value);
}

// Generic normalizer for simple policy objects
function normalizeGenericPolicy(response: Record<string, unknown>): PolicyConfigItem[] {
  const items: PolicyConfigItem[] = [];

  for (const [key, value] of Object.entries(response)) {
    if (SKIP_FIELDS.has(key) || key.startsWith("@")) continue;

    // Handle OMA settings specially
    if (key === "omaSettings" && Array.isArray(value)) {
      items.push(...normalizeOmaSettings(value));
      continue;
    }

    items.push({
      name: formatFieldName(key),
      value: formatValue(value),
    });
  }

  return items;
}

// Normalize OMA-URI settings from Device Configuration
function normalizeOmaSettings(omaSettings: unknown[]): PolicyConfigItem[] {
  const items: PolicyConfigItem[] = [];

  for (const setting of omaSettings) {
    if (typeof setting !== "object" || setting === null) continue;

    const s = setting as Record<string, unknown>;
    const displayName = (s.displayName as string) ?? "OMA Setting";
    const omaUri = s.omaUri as string | undefined;
    const odataType = s["@odata.type"] as string | undefined;

    // Add the OMA-URI path
    if (omaUri) {
      items.push({
        name: `${displayName} (URI)`,
        value: omaUri,
      });
    }

    // Extract value based on the setting type
    let settingValue: unknown = null;

    if (odataType?.includes("String")) {
      settingValue = s.value;
    } else if (odataType?.includes("Integer")) {
      settingValue = s.value;
    } else if (odataType?.includes("Boolean")) {
      settingValue = s.value;
    } else if (odataType?.includes("Base64")) {
      // Base64 encoded value - will be auto-decoded by formatValue
      settingValue = s.value;
    } else if (odataType?.includes("DateTime")) {
      settingValue = s.value;
    } else if (odataType?.includes("FloatingPoint")) {
      settingValue = s.value;
    } else {
      // Fallback: try to get value directly
      settingValue = s.value ?? s.secretReferenceValueId ?? null;
    }

    if (settingValue !== null && settingValue !== undefined) {
      items.push({
        name: `${displayName} (Value)`,
        value: formatValue(settingValue),
      });
    }
  }

  return items;
}

// Helper to extract setting name from definition ID
function getSettingName(defId: string): string {
  // Get the last meaningful part of the definition ID
  const parts = defId.split("_");
  const lastPart = parts[parts.length - 1] ?? defId;
  return formatFieldName(lastPart);
}

// Helper to extract value from a setting instance
function extractSettingValue(instance: Record<string, unknown>, prefix = ""): PolicyConfigItem[] {
  const items: PolicyConfigItem[] = [];
  const defId = (instance.settingDefinitionId as string) ?? "";
  const baseName = prefix ? `${prefix} > ${getSettingName(defId)}` : getSettingName(defId);

  // Handle different value types
  for (const [key, val] of Object.entries(instance)) {
    if (key === "settingDefinitionId" || key === "@odata.type") continue;

    // Simple value (string, number, boolean)
    if (key === "simpleSettingValue" && typeof val === "object" && val !== null) {
      const simpleVal = val as Record<string, unknown>;
      if ("value" in simpleVal) {
        items.push({
          name: baseName,
          value: formatValue(simpleVal.value),
        });
      }
    }
    // Choice setting value
    else if (key === "choiceSettingValue" && typeof val === "object" && val !== null) {
      const choiceVal = val as Record<string, unknown>;
      if ("value" in choiceVal) {
        // Extract the readable part from choice value (usually last part after _)
        const rawValue = choiceVal.value;
        const choiceValueStr = typeof rawValue === "string" ? rawValue : "";
        const displayValue = choiceValueStr.split("_").pop() ?? choiceValueStr;
        items.push({
          name: baseName,
          value: formatFieldName(displayValue),
        });
      }
      // Handle nested children in choice settings
      if ("children" in choiceVal && Array.isArray(choiceVal.children)) {
        for (const child of choiceVal.children) {
          items.push(...extractSettingValue(child as Record<string, unknown>, baseName));
        }
      }
    }
    // Collection of choice settings
    else if (key === "choiceSettingCollectionValue" && Array.isArray(val)) {
      const values: string[] = [];
      for (const item of val) {
        if (typeof item === "object" && item !== null && "value" in item) {
          const rawItemVal = (item as Record<string, unknown>).value;
          const itemVal = typeof rawItemVal === "string" ? rawItemVal : "";
          values.push(itemVal.split("_").pop() ?? itemVal);
        }
      }
      if (values.length > 0) {
        items.push({
          name: baseName,
          value: values.map(v => formatFieldName(v)).join(", "),
        });
      }
    }
    // Group setting collection (nested settings like elevation rules)
    else if (key === "groupSettingCollectionValue" && Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const group = val[i] as Record<string, unknown>;
        const groupPrefix = val.length > 1 ? `${baseName} [${i + 1}]` : baseName;

        // Process children within the group
        if ("children" in group && Array.isArray(group.children)) {
          for (const child of group.children) {
            items.push(...extractSettingValue(child as Record<string, unknown>, groupPrefix));
          }
        }
      }
    }
    // Simple collection value (array of strings/values)
    else if (key === "simpleSettingCollectionValue" && Array.isArray(val)) {
      const values: string[] = [];
      for (const item of val) {
        if (typeof item === "object" && item !== null && "value" in item) {
          values.push(String((item as Record<string, unknown>).value));
        } else if (typeof item === "string" || typeof item === "number") {
          values.push(String(item));
        }
      }
      if (values.length > 0) {
        items.push({
          name: baseName,
          value: values.join(", "),
        });
      }
    }
  }

  return items;
}

// Normalize Settings Catalog response
function normalizeSettingsCatalog(response: { value?: Array<{ settingInstance?: Record<string, unknown> }> }): PolicyConfigItem[] {
  const items: PolicyConfigItem[] = [];
  const settings = response.value ?? [];

  for (const setting of settings) {
    const instance = setting.settingInstance;
    if (!instance) continue;

    const extractedItems = extractSettingValue(instance);
    items.push(...extractedItems);
  }

  // If no items were extracted, show a fallback
  if (items.length === 0 && settings.length > 0) {
    items.push({
      name: "Settings Count",
      value: `${settings.length} setting(s) configured`,
    });
  }

  return items;
}

// Normalize Admin Templates (Group Policy)
function normalizeAdminTemplates(response: { value?: Array<{ definition?: { displayName?: string }; enabled?: boolean }> }): PolicyConfigItem[] {
  const items: PolicyConfigItem[] = [];
  const values = response.value ?? [];

  for (const item of values) {
    const name = item.definition?.displayName ?? "Unknown Setting";
    const enabled = item.enabled;

    items.push({
      name,
      value: enabled === true ? "Enabled" : enabled === false ? "Disabled" : "Not configured",
    });
  }

  return items;
}

// Normalize script content (decode base64)
function normalizeScript(response: Record<string, unknown>): PolicyConfigItem[] {
  const items = normalizeGenericPolicy(response);

  // Decode script content if present
  const scriptContent = response.scriptContent as string | undefined;
  if (scriptContent) {
    try {
      const decoded = atob(scriptContent);
      // Truncate if too long
      const truncated = decoded.length > 500 ? decoded.substring(0, 500) + "..." : decoded;
      items.push({
        name: "Script Content",
        value: truncated,
      });
    } catch {
      // Keep base64 if decode fails
    }
  }

  return items;
}

// Normalize health scripts (proactive remediation)
function normalizeHealthScript(response: Record<string, unknown>): PolicyConfigItem[] {
  const items = normalizeGenericPolicy(response);

  // Decode detection script
  const detectionScript = response.detectionScriptContent as string | undefined;
  if (detectionScript) {
    try {
      const decoded = atob(detectionScript);
      const truncated = decoded.length > 300 ? decoded.substring(0, 300) + "..." : decoded;
      items.push({
        name: "Detection Script",
        value: truncated,
      });
    } catch {
      // Keep as-is
    }
  }

  // Decode remediation script
  const remediationScript = response.remediationScriptContent as string | undefined;
  if (remediationScript) {
    try {
      const decoded = atob(remediationScript);
      const truncated = decoded.length > 300 ? decoded.substring(0, 300) + "..." : decoded;
      items.push({
        name: "Remediation Script",
        value: truncated,
      });
    } catch {
      // Keep as-is
    }
  }

  return items;
}

type NormalizerFn = (response: any) => PolicyConfigItem[];

// Main function to fetch policy configuration
export async function fetchPolicyConfiguration(
  accessToken: string,
  policyId: string,
  policyType: PolicyData["type"],
  odataType?: string
): Promise<PolicyConfigItem[]> {
  const client = getGraphClient(accessToken);

  try {
    let endpoint: string;
    let normalizer: NormalizerFn = normalizeGenericPolicy;

    switch (policyType) {
      case "Settings Catalog":
        endpoint = `/deviceManagement/configurationPolicies/${policyId}/settings`;
        normalizer = normalizeSettingsCatalog;
        break;

      case "Device Configuration":
        endpoint = `/deviceManagement/deviceConfigurations/${policyId}`;
        break;

      case "Compliance Policy":
        endpoint = `/deviceManagement/deviceCompliancePolicies/${policyId}`;
        break;

      case "Application":
        endpoint = `/deviceAppManagement/mobileApps/${policyId}`;
        break;

      case "Script":
        endpoint = `/deviceManagement/deviceManagementScripts/${policyId}`;
        normalizer = normalizeScript;
        break;

      case "Proactive Remediation Script":
        endpoint = `/deviceManagement/deviceHealthScripts/${policyId}`;
        normalizer = normalizeHealthScript;
        break;

      case "Administrative Template":
        endpoint = `/deviceManagement/groupPolicyConfigurations/${policyId}/definitionValues?$expand=definition`;
        normalizer = normalizeAdminTemplates;
        break;

      case "App Configuration Policy":
        endpoint = `/deviceAppManagement/mobileAppConfigurations/${policyId}`;
        break;

      case "App Protection Policy":
        // Determine platform from odataType
        if (odataType?.includes("android")) {
          endpoint = `/deviceAppManagement/androidManagedAppProtections/${policyId}`;
        } else if (odataType?.includes("ios")) {
          endpoint = `/deviceAppManagement/iosManagedAppProtections/${policyId}`;
        } else if (odataType?.includes("windows")) {
          endpoint = `/deviceAppManagement/windowsManagedAppProtections/${policyId}`;
        } else {
          endpoint = `/deviceAppManagement/managedAppPolicies/${policyId}`;
        }
        break;

      case "Autopilot Profile":
        endpoint = `/deviceManagement/windowsAutopilotDeploymentProfiles/${policyId}`;
        break;

      case "Enrollment Status Page":
        endpoint = `/deviceManagement/deviceEnrollmentConfigurations/${policyId}`;
        break;

      case "Cloud PC Provisioning Policy":
        endpoint = `/deviceManagement/virtualEndpoint/provisioningPolicies/${policyId}`;
        break;

      case "Cloud PC User Setting":
        endpoint = `/deviceManagement/virtualEndpoint/userSettings/${policyId}`;
        break;

      // Endpoint Security types (use configurationPolicies like Settings Catalog)
      case "Endpoint Security - Antivirus":
      case "Endpoint Security - Disk Encryption":
      case "Endpoint Security - Firewall":
      case "Endpoint Security - EDR":
      case "Endpoint Security - ASR":
      case "Endpoint Security - EPM":
        endpoint = `/deviceManagement/configurationPolicies/${policyId}/settings`;
        normalizer = normalizeSettingsCatalog;
        break;

      default:
        // Try configurationPolicies for unknown types
        endpoint = `/deviceManagement/configurationPolicies/${policyId}/settings`;
        normalizer = normalizeSettingsCatalog;
    }

    const response = await client.api(endpoint).version("beta").get();
    return normalizer(response);

  } catch (error) {
    console.error("Failed to fetch policy configuration:", error);
    throw new Error("Failed to load configuration");
  }
}
