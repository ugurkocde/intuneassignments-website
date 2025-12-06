import type { PolicyData } from "./graph";

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle?: string | null;
  department?: string | null;
}

export interface GraphGroup {
  id: string;
  displayName: string;
  description?: string | null;
  "@odata.type"?: string;
}

export interface UserSearchResult {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

export interface UserGroupMembership {
  id: string;
  displayName: string;
}

// Tree visualization types for React Flow
export type AssignmentNodeType = "user" | "device" | "group" | "category" | "policy" | "allUsers";

export interface AssignmentNodeData {
  label: string;
  nodeType: AssignmentNodeType;
  // User node specific
  email?: string;
  // Group node specific
  policyCount?: number;
  // Policy node specific
  policyType?: PolicyData["type"];
  assignmentIntent?: "required" | "available" | "excluded";
  inheritedVia?: string;
  // Category node specific
  categoryPolicyCount?: number;
}

export interface UserAssignmentPolicy {
  id: string;
  name: string;
  type: PolicyData["type"];
  assignmentIntent: "required" | "available" | "excluded";
  inheritedVia: string; // Group name or "All Users" or "All Devices"
  groupId?: string;
  // Extended fields for policy details panel
  description?: string;
  lastModifiedDateTime?: string;
  odataType?: string;
  platform?: string;
  // Template info for EPM and other template-based policies
  templateId?: string;
  templateDisplayName?: string;
  // Settings Catalog specific fields
  technologies?: string;
  platforms?: string;
}

export interface GroupWithPolicies {
  group: UserGroupMembership | { id: "all-users"; displayName: "All Users" } | { id: "all-devices"; displayName: "All Devices" };
  policies: UserAssignmentPolicy[];
}

export interface UserAssignmentData {
  user: GraphUser;
  groups: UserGroupMembership[];
  assignments: GroupWithPolicies[];
  totalPolicies: number;
}

// Device types for unified search
export interface GraphDevice {
  id: string;
  displayName: string;
  deviceId?: string;
  serialNumber?: string;
  operatingSystem?: string;
  osVersion?: string;
  managementType?: string;
  enrolledDateTime?: string;
  lastSyncDateTime?: string;
  userPrincipalName?: string;
  "@odata.type"?: string;
}

export interface DeviceAssignmentData {
  device: GraphDevice;
  groups: UserGroupMembership[];
  assignments: GroupWithPolicies[];
  totalPolicies: number;
}

// Union type for search results (used in unified search)
export type SearchResult =
  | { type: "user"; data: GraphUser }
  | { type: "device"; data: GraphDevice };

// Union type for assignment data
export type AssignmentData =
  | { type: "user"; data: UserAssignmentData }
  | { type: "device"; data: DeviceAssignmentData };
