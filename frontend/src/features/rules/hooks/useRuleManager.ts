//  RuleManager.ts
import { useState, useCallback } from "react";
import axios from "axios";
import type { Rule, RuleUI } from "../types/ruleTypes";
import { getRuleKey } from "../utils/ruleUtils";

export function useRuleManager() {
  const [rules, setRules] = useState<RuleUI[]>([]);
  const [rulesBeforeChange, setRulesBeforeChange] = useState<RuleUI[]>([]);
  const [modifiedRules, setModifiedRules] = useState<Map<string, RuleUI>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [maxPendingChanges, ] = useState(25);

  const hasPendingChanges = useCallback(() => modifiedRules.size > 0, [modifiedRules]);

  const hasMaxPendingChanges = useCallback(() => modifiedRules.size >= maxPendingChanges, [modifiedRules, maxPendingChanges]);


  const fetchPage = useCallback(async (page: number) => {
    const skip = (page - 1) * pageSize;
    const take = page === 1 ? pageSize * 2 : pageSize;
    const response = await axios.get<Rule[]>(`/rules?skip=${skip}&take=${take}`);
    const newRules: RuleUI[] = response.data.map((rule, index) => ({
      ...rule,
      displayPriority: (page - 1) * pageSize + index + 1,
      sources: rule.sources ?? [],
      destinations: rule.destinations ?? [],
      isLastRule: rule.priority === 1000000000,
    }));

    setRules(newRules);
    setRulesBeforeChange(JSON.parse(JSON.stringify(newRules)));
    setModifiedRules(new Map());
  }, [pageSize]);

  const updateDisplayPriorities = useCallback((updatedRules: RuleUI[]) => {
    return updatedRules.map((rule, idx) => ({ ...rule, displayPriority: idx + 1 }));
  }, []);

  // we calculate the priority after changing the rules
  const calculatePriority = useCallback((rules: RuleUI[], idx: number): number => {
    const prevPriority = idx > 0 ? rules[idx-1].priority ?? 0 : 0;
    const nextPriority = rules[idx+1]?.priority!;
    return (prevPriority + nextPriority) / 2;
  }, []);

  const addRule = useCallback((newRule: Omit<RuleUI, "id" | "priority" | "timestamp">) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    
    const displayPriority = newRule.displayPriority;
    const tempId = `temp-${Date.now()}`;
    //const priority = calculatePriority(rules, displayPriority);
    const timestamp = Date.now();

    const ruleUI: RuleUI = {
      ...newRule,
      tempId,
      // priority,
      timestamp,
      displayPriority,
      isLastRule: false,
    };

    const updatedRules = [...rules.slice(0, displayPriority - 1), ruleUI, ...rules.slice(displayPriority - 1)];
    const priority = calculatePriority(updatedRules, displayPriority - 1);
    ruleUI.priority = priority;
    const adjusted = updateDisplayPriorities(updatedRules);
    setRules(adjusted);

    const newModMap = new Map(modifiedRules);
    newModMap.set(tempId, ruleUI);
    setModifiedRules(newModMap);
  }, [rules, hasMaxPendingChanges, calculatePriority, modifiedRules, updateDisplayPriorities]);

  const editRule = useCallback((edited: RuleUI) => {
    const index = rules.findIndex(r => getRuleKey(r) === getRuleKey(edited));
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot edit the last fixed rule");
    edited.timestamp = Date.now();

    let updated = [...rules];
    updated[index] = edited;
    if(edited.displayPriority !== index + 1) {
      const [moved] = updated.splice(index, 1);
      const toIdx = edited.displayPriority - 1;
      updated.splice(toIdx, 0, moved);
      const newPriority = calculatePriority(updated, toIdx);
      updated[toIdx].priority = newPriority;
      updated = updateDisplayPriorities(updated);
      edited = updated[toIdx];
    }
    setRules(updated);

    const newMap = new Map(modifiedRules);
    newMap.set(getRuleKey(edited), edited);
    setModifiedRules(newMap);
  }, [rules, modifiedRules]);

  const deleteRule = useCallback((ruleId: string) => {
    const index = rules.findIndex(r => getRuleKey(r) === ruleId);
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot delete the last fixed rule");
    const updated = [...rules];
    const [deletedRule] = updated.splice(index, 1);
    const adjusted = updateDisplayPriorities(updated);
    setRules(adjusted);

    const newMap = new Map(modifiedRules);
    if (deletedRule.id) {
      deletedRule.deleted = true;
      newMap.set(deletedRule.id, deletedRule);
    } else {
      newMap.delete(ruleId);
    }
    setModifiedRules(newMap);
  }, [rules, rulesBeforeChange, modifiedRules, updateDisplayPriorities]);

  const moveRule = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (rules[fromIdx].isLastRule || rules[toIdx]?.isLastRule) throw new Error("Cannot move the last fixed rule");
    let updated = [...rules];
    // const newPriority = calculatePriority(updated, toIdx);
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    const newPriority = calculatePriority(updated, toIdx);
    console.log("New priority:", newPriority);
    updated[toIdx].priority = newPriority;
    updated[toIdx].timestamp = Date.now();
    updated = updateDisplayPriorities(updated);
    console.log("New updated:", updated);
    setRules(updated);
    const newMap = new Map(modifiedRules);
    newMap.set(getRuleKey(updated[toIdx]), updated[toIdx]);
    setModifiedRules(newMap);
    //updated.forEach(r => newMap.set(getRuleKey(r), r));
    //setModifiedRules(newMap);
  }, [rules, modifiedRules, updateDisplayPriorities, calculatePriority]);

  const toBackendRule = useCallback((rule: RuleUI): Rule => {
    return {
      id: rule.id, // might be undefined if new
      name: rule.name,
      action: rule.action,
      sources: rule.sources,
      destinations: rule.destinations,
      priority: rule.priority ?? 0,
      timestamp: rule.timestamp ?? Date.now(),
      ...(rule.deleted ? { deleted: true } : {}),
    };
  }, []);

  const saveChanges = useCallback(async () => {
    if (!hasPendingChanges()) return;

    const changes = Array.from(modifiedRules.values())
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .map(toBackendRule);

    await axios.post("/rules/bulk-save", { modifiedRules: changes });
    await fetchPage(currentPage);
  }, [modifiedRules, fetchPage, currentPage, hasPendingChanges, toBackendRule]);

  const clearChanges = useCallback(() => {
    setRules(JSON.parse(JSON.stringify(rulesBeforeChange)));
    setModifiedRules(new Map());
  }, [rulesBeforeChange]);

  return {
    rules,
    hasPendingChanges,
    hasMaxPendingChanges,
    fetchPage,
    addRule,
    editRule,
    deleteRule,
    moveRule,
    saveChanges,
    clearChanges,
    currentPage,
    setCurrentPage,    
    pageSize,
    setPageSize,
  };
}
