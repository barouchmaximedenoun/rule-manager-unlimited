export type Source = {
  name: string;
  email: string;
};

export type Destination = {
  name: string;
  email: string;
};

export const DEFAULT_PRIORITY = 1_000_000_001; // 1 milliard 1
export type RuleAction = "Allow" | "Block";

export type Rule = {
  id?: string; // UUID
  tenantId?: string | null;  // nullable
  name: string;
  sources: Source[];
  destinations: Destination[];
  action: RuleAction;
  priority: number; // float, not displayPriority
  timestamp: number; // Unix ms
};
