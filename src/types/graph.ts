export interface GraphResponse<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

export interface AssignmentTarget {
  "@odata.type": string;
  groupId?: string;
  deviceAndAppManagementAssignmentFilterId?: string;
  deviceAndAppManagementAssignmentFilterType?: string;
}

export interface Assignment {
  id: string;
  target: AssignmentTarget;
  intent?: "required" | "available" | "uninstall" | "availableWithoutEnrollment";
}

export interface IntunePolicy {
  id: string;
  displayName: string;
  assignments?: Assignment[];
  lastModifiedDateTime?: string;
  description?: string;
  "@odata.type"?: string;
  name?: string; // Some policies use 'name' instead of 'displayName'
}

export type DeviceConfiguration = IntunePolicy;
export type DeviceCompliancePolicy = IntunePolicy;
export type MobileApp = IntunePolicy & {
  isAssigned?: boolean;
};
export type DeviceManagementScript = IntunePolicy;
export type ConfigurationPolicy = IntunePolicy; // Settings Catalog
export type GroupPolicyConfiguration = IntunePolicy; // Admin Templates
export type ManagedAppPolicy = IntunePolicy; // App Protection
export type MobileAppConfiguration = IntunePolicy; // App Config
export type DeviceHealthScript = IntunePolicy; // Proactive Remediation
export type WindowsAutopilotDeploymentProfile = IntunePolicy;
export type DeviceEnrollmentConfiguration = IntunePolicy;
export type CloudPCProvisioningPolicy = IntunePolicy;
export type CloudPCUserSetting = IntunePolicy;
export type DeviceManagementIntent = IntunePolicy; // Endpoint Security

// Consolidated type for our app
export interface PolicyData {
  id: string;
  name: string;
  type:
    | "Device Configuration"
    | "Compliance Policy"
    | "Application"
    | "Script"
    | "Settings Catalog"
    | "Administrative Template"
    | "App Protection Policy"
    | "App Configuration Policy"
    | "Proactive Remediation Script"
    | "Autopilot Profile"
    | "Enrollment Status Page"
    | "Cloud PC Provisioning Policy"
    | "Cloud PC User Setting"
    | "Endpoint Security - Antivirus"
    | "Endpoint Security - Disk Encryption"
    | "Endpoint Security - Firewall"
    | "Endpoint Security - EDR"
    | "Endpoint Security - ASR"
    | "Endpoint Security - EPM";
  assignmentStatus: "All Users" | "All Devices" | "Group" | "None" | "Exclude";
  assignedTo: string[]; // Group names or IDs
  platform?: string;
  // Fields for Intune URL generation
  odataType?: string;
  templateId?: string;
  templateDisplayName?: string;
  technologies?: string;
  platforms?: string;
  // Timestamps
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}
