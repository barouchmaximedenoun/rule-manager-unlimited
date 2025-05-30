export type Source = {
  name: string;
  email: string;
};

export type Destination = {
  name: string;
  email: string;
};

export type RuleAction = "Allow" | "Block";

export type Rule = {
  id?: string; // UUID
  //tenantId: string;
  name: string;
  sources: Source[];
  destinations: Destination[];
  action: RuleAction;
  priority: number; // float, not displayPriority
  timestamp: number; // Unix ms
};
