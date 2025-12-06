import type { PolicyData } from "~/types/graph";

interface IntuneUrlOptions {
  templateId?: string;
  templateDisplayName?: string;
  technologies?: string;
  platforms?: string;
}

// Convert platforms string to URL-friendly platform name
function getPlatformNameForUrl(platforms?: string): string {
  if (!platforms) return "windows10";
  const lower = platforms.toLowerCase();
  if (lower.includes("macos") || lower.includes("mac")) return "macOS";
  if (lower.includes("ios")) return "iOS";
  if (lower.includes("android")) return "android";
  if (lower.includes("linux")) return "linux";
  return "windows10";
}

// Mapping of policy types to their template family names and technology
const endpointSecurityConfig: Record<string, { templateFamily: string; technology: string }> = {
  "Endpoint Security - Antivirus": { templateFamily: "endpointSecurityAntivirus", technology: "mdm" },
  "Endpoint Security - Disk Encryption": { templateFamily: "endpointSecurityDiskEncryption", technology: "mdm" },
  "Endpoint Security - Firewall": { templateFamily: "endpointSecurityFirewall", technology: "mdm" },
  "Endpoint Security - EDR": { templateFamily: "endpointSecurityEndpointDetectionAndResponse", technology: "mdm" },
  "Endpoint Security - ASR": { templateFamily: "endpointSecurityAttackSurfaceReductionRules", technology: "mdm" },
  "Endpoint Security - EPM": { templateFamily: "endpointSecurityEndpointPrivilegeManagement", technology: "endpointPrivilegeManagement" },
};

/**
 * Builds the Microsoft Intune admin center URL for a specific policy
 */
export function getIntuneUrl(
  policyId: string,
  policyType: PolicyData["type"],
  odataType?: string,
  options?: IntuneUrlOptions
): string {
  const baseUrl = "https://intune.microsoft.com";

  // Special handling for Endpoint Security policies with template info
  const esConfig = endpointSecurityConfig[policyType];
  if (esConfig && options?.templateId) {
    const templateName = encodeURIComponent(options.templateDisplayName ?? policyType);
    return `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/templateId/${options.templateId}/templateTypeName/${templateName}/platformName/windows10/isAssigned~/true/technology/${esConfig.technology}/templateFamilyName/${esConfig.templateFamily}`;
  }

  // Special handling for Settings Catalog with platform/technology info
  if (policyType === "Settings Catalog" && (options?.technologies || options?.platforms)) {
    const technology = encodeURIComponent(options.technologies ?? "mdm");
    const platformName = getPlatformNameForUrl(options.platforms);
    return `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/isAssigned~/true/technology/${technology}/templateId//platformName/${platformName}`;
  }

  // URL patterns for different policy types
  const urlPatterns: Record<string, string> = {
    // Device Management
    "Device Configuration": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/ConfigurePolicy.ReactView/policyId/${policyId}/policyType/0`,
    "Compliance Policy": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/CompliancePolicy.ReactView/policyId/${policyId}`,
    "Settings Catalog": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/isAssigned~/true/technology/mdm/templateId//platformName/windows10`,
    "Administrative Template": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/GroupPolicyConfigurationDetail.ReactView/policyId/${policyId}`,
    "Script": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/ConfigureWMPolicy.ReactView/policyId/${policyId}/policyType/4`,
    "Proactive Remediation Script": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/DeviceHealthScript.ReactView/policyId/${policyId}`,

    // Apps
    "Application": `${baseUrl}/#view/Microsoft_Intune_Apps/SettingsMenu/~/0/appId/${policyId}`,
    "App Protection Policy": `${baseUrl}/#view/Microsoft_Intune_Apps/AppProtectionPolicyDetailBlade/policyId/${policyId}`,
    "App Configuration Policy": `${baseUrl}/#view/Microsoft_Intune_Apps/AppConfigurationPolicySettingsBlade/policyId/${policyId}`,

    // Enrollment
    "Autopilot Profile": `${baseUrl}/#view/Microsoft_Intune_Enrollment/AutopilotProfileBlade/profileId/${policyId}`,
    "Enrollment Status Page": `${baseUrl}/#view/Microsoft_Intune_Enrollment/EnrollmentStatusPageProfile/profileId/${policyId}`,

    // Cloud PC
    "Cloud PC Provisioning Policy": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/CloudPCProvisioningPolicyBlade/policyId/${policyId}`,
    "Cloud PC User Setting": `${baseUrl}/#view/Microsoft_Intune_DeviceSettings/CloudPCUserSettingBlade/settingId/${policyId}`,

    // Endpoint Security fallbacks (without template info)
    "Endpoint Security - Antivirus": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
    "Endpoint Security - Disk Encryption": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
    "Endpoint Security - Firewall": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
    "Endpoint Security - EDR": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
    "Endpoint Security - ASR": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
    "Endpoint Security - EPM": `${baseUrl}/#view/Microsoft_Intune_Workflows/PolicySummaryBlade/policyId/${policyId}/policyType/2`,
  };

  // Return the specific URL or a generic fallback
  return urlPatterns[policyType] || `${baseUrl}/#home`;
}

/**
 * Extracts the platform from the @odata.type string
 */
export function getPlatformFromOdataType(odataType?: string): string | undefined {
  if (!odataType) return undefined;

  const lowerType = odataType.toLowerCase();

  if (lowerType.includes("windows")) return "Windows";
  if (lowerType.includes("macos") || lowerType.includes("mac")) return "macOS";
  if (lowerType.includes("ios") || lowerType.includes("iphone") || lowerType.includes("ipad")) return "iOS/iPadOS";
  if (lowerType.includes("android")) return "Android";
  if (lowerType.includes("linux")) return "Linux";

  return undefined;
}

/**
 * Formats a date string for display
 */
export function formatPolicyDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}
