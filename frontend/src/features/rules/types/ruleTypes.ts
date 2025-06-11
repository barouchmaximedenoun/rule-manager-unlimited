export const LAST_RULE_PRIORITY = 1000000001; // This is the priority of the last rule, it should not be changed

export interface Source {
    name: string;
    email: string;
  }
  
export interface Destination {
    name: string;
    email: string;
}

export type RuleAction = "Allow" | "Block";

export interface Rule {
    id?: string;
    action: RuleAction;
    name: string;
    sources: Source[];
    destinations: Destination[];
    priority: number;
    timestamp: number;
    tenantId?: string | null; // used for admin tenant
}

export type RuleUI = Omit<Rule, "priority" | "timestamp"> & {
    tempId?: string;
    priority?: number;
    timestamp?: number;
    displayPriority: number;
    isLastRule?: boolean;
    deleted?: boolean;
};

export type ModifiedRule = RuleUI & {
    originalIndex: number | null; // null si ajout
    newIndex: number | null; // null si suppression
}
