import type { RuleUI } from "../types/ruleTypes";

export function getRuleKey(rule: RuleUI): string {
  return rule.id ?? rule.tempId!;
}

