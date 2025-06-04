//  RuleManager.ts
import { useState, useCallback } from "react";
import axios from "axios";
import type { ModifiedRule, Rule, RuleUI } from "../types/ruleTypes";
import { computeOutOfRulesPriority, fetchRulesAt, getRuleKey, mergeUniqueKeepFirst, computeAdjustedSkipAndTake } from "../utils/ruleUtils";
import { useToast } from "@/hooks/use-toast";

const LAST_RULE_PRIORITY = 1000000000; // This is the priority of the last rule, it should not be changed
const MAX_PENDING_CHANGES = 200; // Maximum number of pending changes before blocking further modifications to avoid timeout in save
export function useRuleManager() {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleUI[]>([]);
  const [modifiedRules, setModifiedRules] = useState<Map<string, ModifiedRule>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [maxPendingChanges, ] = useState(MAX_PENDING_CHANGES); // lets open it to the sky but let s keep it for after testing to avoid timeout or let use websocket

  const hasPendingChanges = useCallback(() => modifiedRules.size > 0, [modifiedRules]);

  const hasMaxPendingChanges = useCallback(() => modifiedRules.size >= maxPendingChanges, [modifiedRules, maxPendingChanges]);

  
  const fetchPage = useCallback(async (prevPage: number | undefined, page: number) => {
    const skip = (page - 1) * pageSize;
    const take = page === 1 ? pageSize * 2 : pageSize;

    let alreadyLoadedRules: RuleUI[] = [];
    let realSkip = skip;
    let realTake = take;

    if (prevPage === page - 1) {
      // 👉 NEXT page
      alreadyLoadedRules = rules.slice(pageSize, pageSize * 2);
      const alreadyCount = alreadyLoadedRules.length;

      const adjusted = computeAdjustedSkipAndTake(skip + alreadyCount, take - alreadyCount, modifiedRules);
      realSkip = adjusted.realSkip;
      realTake = adjusted.realTake;
    } else if (prevPage === page + 1) {
      // 👉 PREVIOUS page
      alreadyLoadedRules = rules.slice(0, pageSize);
      const alreadyCount = alreadyLoadedRules.length;

      const adjusted = computeAdjustedSkipAndTake(skip, take - alreadyCount, modifiedRules);
      realSkip = adjusted.realSkip;
      realTake = adjusted.realTake;
    } else {
      // 👉 First load or big jump
      const adjusted = computeAdjustedSkipAndTake(skip, take, modifiedRules);
      realSkip = adjusted.realSkip;
      realTake = adjusted.realTake;
    }

    console.log("Fetching page", page, "skip", skip, "realSkip", realSkip, "realTake", realTake);
    const response = await fetchRulesAt(realSkip, realTake);
    
    const newRules: RuleUI[] = response.data.map((rule, index) => ({
      ...rule,
      displayPriority: (page - 1) * pageSize + index + 1,
      sources: rule.sources ?? [],
      destinations: rule.destinations ?? [],
      isLastRule: rule.priority === LAST_RULE_PRIORITY,
    }));

    if (prevPage === page - 1 || prevPage === page + 1) {
      setRules(mergeUniqueKeepFirst<RuleUI, string>([alreadyLoadedRules, newRules], getRuleKey));
    } else {
      setRules(newRules); // ✅ Remplace tout si première fois ou saut de page
    }
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

  const addRule = useCallback(async (newRule: Omit<RuleUI, "id" | "priority" | "timestamp">) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    
    const displayPriority = newRule.displayPriority;
    const tempId = `temp-${Date.now()}`;
    const timestamp = Date.now();

    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
    const pageMaxVisibleIndex = pageMinVisibleIndex + rules.length - 1;

    const isInPageRange =
      displayPriority >= pageMinVisibleIndex &&
      displayPriority <= pageMaxVisibleIndex;

    const baseRule: RuleUI = {
      ...newRule,
      tempId,
      timestamp,
      displayPriority,
      isLastRule: false,
    };

    let updatedRules = [...rules];
    const modMap = new Map(modifiedRules);

    let priority: number;

    if (isInPageRange) {
      // ✅ simple case: insert in page
      const toIdx = displayPriority - pageMinVisibleIndex;
      updatedRules.splice(toIdx, 0, baseRule);
      priority = calculatePriority(updatedRules, toIdx);
    } else {
      // ✅ complexe case : insert out of page
      const { priority: computedPriority } = await computeOutOfRulesPriority(
        currentPage,
        pageSize,
        displayPriority,
        modMap,
        rules
      );
      priority = computedPriority;
    }

    const completeRule: RuleUI = {
      ...baseRule,
      priority,
      timestamp: Date.now(),
    };

    if (isInPageRange) {
      const toIdx = displayPriority - pageMinVisibleIndex;
      updatedRules[toIdx] = completeRule;
      const adjusted = updateDisplayPriorities(updatedRules);
      setRules(adjusted);
    }

    const modifiedEntry: ModifiedRule = {
      ...completeRule,
      originalIndex: null,
      newIndex: isInPageRange ? displayPriority - 1 : null,
    };
    modMap.set(tempId, modifiedEntry);
    setModifiedRules(modMap);
  }, [rules, hasMaxPendingChanges, calculatePriority, modifiedRules, updateDisplayPriorities, currentPage, pageSize]);

  const editRule = useCallback(async (edited: RuleUI) => {
    const index = rules.findIndex(r => getRuleKey(r) === getRuleKey(edited));
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot edit the last fixed rule");

    edited.timestamp = Date.now();

    const shouldMove = edited.displayPriority !== index + 1;

    if (!shouldMove) {
      const updated = [...rules];
      updated[index] = edited;
      setRules(updated);

      const newMap = new Map(modifiedRules);
      newMap.set(getRuleKey(edited), {
        ...edited,
        originalIndex: index,
        newIndex: index
      });
      setModifiedRules(newMap);
      return;
    }
    // -------------------------------------
    // 🧠 Step 2 : moving the rule
    // -------------------------------------

    const updated = [...rules];
    updated.splice(index, 1); // remove the rule
    
    let newPriority: number;

    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
    const pageMaxVisibleIndex = pageMinVisibleIndex + rules.length - 1;

    const isInPageRange = edited.displayPriority >= pageMinVisibleIndex &&
                          edited.displayPriority <= pageMaxVisibleIndex;

    const toIdx = edited.displayPriority - pageMinVisibleIndex;
    const ruleKey = getRuleKey(edited);
    const modMap = new Map(modifiedRules);

    let originalIndex = index;
    if(modMap.has(ruleKey)) {
      originalIndex = modMap.get(ruleKey)?.originalIndex ?? index;
    }
    modMap.delete(ruleKey); // ⚠️ IMPORTANT : remove temporary for correct calculation

    if (isInPageRange) {
      // ✅ Simple case : move inside the page
      newPriority = calculatePriority(updated, toIdx);
    } else {
      // ✅ Complexe case : move out of the page
      const { priority } = await computeOutOfRulesPriority(
        currentPage,
        pageSize,
        edited.displayPriority,
        modMap,
        rules
      );
      newPriority = priority;
    }

    const movedUpdated: RuleUI = {
      ...edited,
      priority: newPriority,
      timestamp: Date.now(),
    };

    // update the aray
    if (isInPageRange) {
      updated.splice(toIdx, 0, movedUpdated); // insert to new position
      const finalUpdated = updateDisplayPriorities(updated);
      setRules(finalUpdated);
    }
    
    const modifiedEntry: ModifiedRule = {
      ...movedUpdated,
      originalIndex,
      newIndex: edited.displayPriority - 1
    };
    modMap.set(ruleKey, modifiedEntry);
    setModifiedRules(modMap);
  }, [rules, modifiedRules, currentPage, pageSize, calculatePriority]);

  const deleteRule = useCallback(async (ruleId: string) => {
    const index = rules.findIndex(r => getRuleKey(r) === ruleId);
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot delete the last fixed rule");

    const updated = [...rules];
    const [deletedRule] = updated.splice(index, 1);

    const newMap = new Map(modifiedRules);
    const key = getRuleKey(deletedRule);
    const base: ModifiedRule = {
      ...deletedRule,
      deleted: true,
      originalIndex: newMap.get(key)?.originalIndex ?? index,
      newIndex: null,
    };

    if (deletedRule.id) {
      newMap.set(deletedRule.id, base); // règle existante → marquer supprimée
    } else {
      newMap.delete(key); // règle temporaire → retirer complètement
    }

    // check if we need to fetch more rules to complete second page of buffer for deletion
    const lastRule = updated[updated.length - 1];
    const canFetchMore = !lastRule?.isLastRule && updated.length === pageSize + 2;

    let finalRules = updateDisplayPriorities(updated);

    if (canFetchMore) {
      const missing = pageSize - updated.length;
      if (missing > 0) {
        const skip = currentPage * pageSize + updated.length;
        const { realSkip, realTake } = computeAdjustedSkipAndTake(skip, missing, newMap);
        const response = await fetchRulesAt(realSkip, realTake);

        const newRules = response.data.map((rule, i) => ({
          ...rule,
          displayPriority: finalRules.length + i + 1,
          sources: rule.sources ?? [],
          destinations: rule.destinations ?? [],
          isLastRule: rule.priority === LAST_RULE_PRIORITY,
        }));

        finalRules = updateDisplayPriorities([...finalRules, ...newRules]);
      }
    }

    setRules(finalRules);
    setModifiedRules(newMap);
  }, [rules, modifiedRules, updateDisplayPriorities, pageSize, currentPage]);



  const moveRule = useCallback((fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    if (rules[fromIdx].isLastRule || rules[toIdx]?.isLastRule) throw new Error("Cannot move the last fixed rule");
    let updated = [...rules];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    const newPriority = calculatePriority(updated, toIdx);
    console.log("New priority:", newPriority);
    updated[toIdx].priority = newPriority;
    updated[toIdx].timestamp = Date.now();
    updated = updateDisplayPriorities(updated);
    console.log("New updated:", updated);
    setRules(updated);
    const ruleKey = getRuleKey(updated[toIdx]);
    const isNew = !!updated[toIdx].tempId;
    const existing = modifiedRules.get(ruleKey);
    const originalIndex = existing?.originalIndex ?? (isNew ? null : fromIdx);

    const newMap = new Map(modifiedRules);
    newMap.set(getRuleKey(updated[toIdx]), {
      ...updated[toIdx],
      originalIndex,
      newIndex: toIdx,
    });
    setModifiedRules(newMap);
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

    if (changes.length === 0) return; // No changes to save

    try {
      await axios.post("/rules/bulk-save", { modifiedRules: changes }, {
        withCredentials: true
      });

      await fetchPage(undefined, currentPage);
      setModifiedRules(new Map()); // Clear modified rules after successful save
      toast({
              title: "✅ Save succesfull",
              description: `Rules saved successfully.`,
            });
    } catch (error) {
      console.error("Failed to save rules:", error);
      // Optionnel : show toast, set error state, etc.
    }
  }, [modifiedRules, fetchPage, currentPage, hasPendingChanges, toBackendRule]);

  const clearChanges = useCallback(async () => {
      setModifiedRules(new Map());
      await fetchPage(undefined, currentPage);
  }, [fetchPage, currentPage]);

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
