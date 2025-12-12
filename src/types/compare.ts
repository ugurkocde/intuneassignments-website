import type { GraphDevice, GraphGroup, GraphUser } from "~/types/user";

export type CompareSubjectType = "user" | "device" | "group";

export type CompareSearchResult =
  | { type: "user"; data: GraphUser }
  | { type: "device"; data: GraphDevice }
  | { type: "group"; data: GraphGroup };

export type CompareSubject = {
  type: CompareSubjectType;
  id: string;
  label: string;
  subtitle?: string;
};

export const subjectKey = (s: { type: CompareSubjectType; id: string }) =>
  `${s.type}:${s.id}`;


