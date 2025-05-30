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
}

export type RuleUI = Omit<Rule, "priority" | "timestamp"> & {
    tempId?: string;
    priority?: number;
    timestamp?: number;
    displayPriority: number;
    isLastRule?: boolean;
    deleted?: boolean;
};
