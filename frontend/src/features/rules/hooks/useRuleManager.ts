//  RuleManager.ts
import { useState, useCallback } from "react";
import axios from "axios";
import { LAST_RULE_PRIORITY, type ModifiedRule, type Rule, type RuleUI } from "../types/ruleTypes";
import { computeOutOfRulesPriority, fetchRulesAt, getRuleKey, mergeUniqueKeepFirst, computeAdjustedSkipAndTake, updateDisplayPriorities, calculatePriority, applyModifiedRulesToFetched } from "../utils/ruleUtils";
import { useToast } from "@/hooks/use-toast";

const MAX_PENDING_CHANGES = 50; // Maximum number of pending changes before blocking further modifications to avoid timeout in save
export function useRuleManager() {
  const { toast } = useToast();
  const [rules, setRules] = useState<RuleUI[]>([]);
  const [modifiedRules, setModifiedRules] = useState<Map<string, ModifiedRule>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalRulesCount, setTotalRulesCount] = useState(0);
  const [maxPendingChanges, ] = useState(MAX_PENDING_CHANGES); // lets open it to the sky but let s keep it for after testing to avoid timeout or let use websocket

  const hasPendingChanges = useCallback(() => modifiedRules.size > 0, [modifiedRules]);

  const hasMaxPendingChanges = useCallback(() => modifiedRules.size >= maxPendingChanges, [modifiedRules, maxPendingChanges]);

  
  const fetchPage = useCallback(async (prevPage: number | null, page: number, prevPageSise: number | null, pageSize: number, options : {ignoreModifiedRules: boolean} = {ignoreModifiedRules: false}) => {
    if(prevPage === page && prevPageSise === pageSize) {
      // No need to fetch if the page and size haven't changed
      return;
    }
    const skip = (page - 1) * pageSize;
    const take = page === 1 ? pageSize * 2 : pageSize;

    const isNextPage = prevPage === page - 1
    const isPrevPage = prevPage === page + 1;
    const isPageSizeChanged = prevPageSise !== pageSize;
    let alreadyLoadedRules: RuleUI[] = [];
    let realSkip = skip;
    let realTake = take;

    if(!isPageSizeChanged) {
      if (isNextPage) {
        // 👉 NEXT page
        alreadyLoadedRules = rules.slice(pageSize, pageSize * 2);
        const alreadyCount = alreadyLoadedRules.length;

        const adjusted = computeAdjustedSkipAndTake(skip + alreadyCount, (2 * take) - alreadyCount, modifiedRules);
        realSkip = adjusted.realSkip;
        realTake = adjusted.realTake;
      } else if (isPrevPage) {
        // 👉 PREVIOUS page
        alreadyLoadedRules = rules.slice(0, pageSize);
        const alreadyCount = alreadyLoadedRules.length;
        const adjusted = computeAdjustedSkipAndTake(skip, (2 * take) - alreadyCount, modifiedRules);
        realSkip = adjusted.realSkip;
        realTake = adjusted.realTake;
      } else {
        // 👉 First load or big jump
        const adjusted = computeAdjustedSkipAndTake(skip, take, modifiedRules);
        realSkip = adjusted.realSkip;
        realTake = adjusted.realTake;
      }
    }

    console.log("Fetching page", page, "skip", skip, "take", take, "realSkip", realSkip, "realTake", realTake);
    const response = await fetchRulesAt(realSkip, realTake);
    
    let newRules: RuleUI[] = response.data?.rules?.map((rule, index) => {
      // If not modified, use the default display priority 
      return {
        ...rule,
        displayPriority: (page - 1) * pageSize + index + 1,
        sources: rule.sources ?? [],
        destinations: rule.destinations ?? [],
        isLastRule: rule.priority === LAST_RULE_PRIORITY,
    }});

    if (!isPageSizeChanged && (isNextPage || isPrevPage)) {
      if(isNextPage ) { //next page
        newRules = mergeUniqueKeepFirst<RuleUI, string>([alreadyLoadedRules, newRules], getRuleKey);
      }
      else { //previous page
        newRules = mergeUniqueKeepFirst<RuleUI, string>([newRules, alreadyLoadedRules], getRuleKey);
      }
    } 
    let count = response.data?.totalCount ?? 0;
    if(!options.ignoreModifiedRules) {
      newRules = applyModifiedRulesToFetched(
        newRules,
        modifiedRules,
        skip,
        take,
        getRuleKey,
        "timestamp" // optionnel: secondary sort key
      );
      Array.from(modifiedRules.values()).forEach(rule => {
        if(rule.deleted) {
          count--; // Decrement count for deleted rules
        } else if(rule.tempId) {
          count++; // Increment count for new rules
        } 
      });
    }
    setTotalRulesCount(count);
    setRules(updateDisplayPriorities(newRules, skip));
  }, [rules, modifiedRules]);

  const insertOrMoveRule = useCallback(async (
    baseRule: RuleUI,
    ruleIndex?: number // when editing an existing rule, this is the index in the current rules array
  ) => {
    const displayPriority = baseRule.displayPriority;
    const modMap = new Map(modifiedRules);
    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
    const pageMaxRulesIndex = pageMinVisibleIndex + rules.length - 1;
    
    const isInRulesRange = displayPriority >= pageMinVisibleIndex && displayPriority <= pageMaxRulesIndex;
    let updated = [...rules];

    if (ruleIndex !== undefined) {
      updated.splice(ruleIndex, 1);
      modMap.delete(getRuleKey(baseRule));
    }

    let priority: number;
    if (isInRulesRange) {
      const toIdx = displayPriority - pageMinVisibleIndex;
      updated.splice(toIdx, 0, baseRule);
      priority = calculatePriority(updated, toIdx);
      updated[toIdx].priority = priority;
    } else {
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

    if (isInRulesRange || ruleIndex !== undefined) {
      const finalUpdated = updateDisplayPriorities(updated, pageMinVisibleIndex - 1);
      setRules(finalUpdated);
    }

    const modifiedEntry: ModifiedRule = {
      ...completeRule,
      originalIndex: ruleIndex ? modMap.get(getRuleKey(baseRule))?.originalIndex ?? (pageMinVisibleIndex + ruleIndex) : null,
      newIndex: displayPriority,
    };

    modMap.set(getRuleKey(completeRule), modifiedEntry);
    setModifiedRules(modMap);
  }, [rules, modifiedRules, currentPage, pageSize]);

  const addRule = useCallback(async (newRule: Omit<RuleUI, "id" | "priority" | "timestamp">) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    
    //const displayPriority = newRule.displayPriority;
    const tempId = `temp-${Date.now()}`;
    const timestamp = Date.now();

    const baseRule: RuleUI = {
      ...newRule,
      tempId,
      timestamp,
      //displayPriority,
      isLastRule: false,
    };

    await insertOrMoveRule(baseRule); 
    setTotalRulesCount(count => count + 1); // Increment total count for new rule
  }, [rules, hasMaxPendingChanges, modifiedRules, currentPage, pageSize]);

  const editRule = useCallback(async (edited: RuleUI) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    const index = rules.findIndex(r => getRuleKey(r) === getRuleKey(edited));
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot edit the last fixed rule");

    edited.timestamp = Date.now();
    
    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
    const displayIndex = pageMinVisibleIndex + index
    const shouldMove = edited.displayPriority !== displayIndex;

    if (!shouldMove) {
      const updated = [...rules];
      updated[index] = edited;
      setRules(updated);

      const newMap = new Map(modifiedRules);
      newMap.set(getRuleKey(edited), {
        ...edited,
        originalIndex: displayIndex,
        newIndex: displayIndex
      });
      setModifiedRules(newMap);
      return;
    }
    // -------------------------------------
    // 🧠 Step 2 : moving the rule
    // -------------------------------------
    const baseRule: RuleUI = { ...edited, timestamp: Date.now() };
    await insertOrMoveRule(baseRule, index ); 
  }, [rules, hasMaxPendingChanges, modifiedRules, currentPage, pageSize]);

  const deleteRule = useCallback(async (ruleId: string) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    const index = rules.findIndex(r => getRuleKey(r) === ruleId);
    if (index === -1) throw new Error("Rule not found");
    if (rules[index].isLastRule) throw new Error("Cannot delete the last fixed rule");

    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
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

    let finalRules = updateDisplayPriorities(updated, pageMinVisibleIndex - 1);

    if (canFetchMore) {
      const missing = pageSize - updated.length;
      if (missing > 0) {
        const skip = currentPage * pageSize + updated.length;
        const { realSkip, realTake } = computeAdjustedSkipAndTake(skip, missing, newMap);
        const response = await fetchRulesAt(realSkip, realTake);

        const newRules = response.data.rules.map((rule, i) => ({
          ...rule,
          displayPriority: finalRules.length + i + 1,
          sources: rule.sources ?? [],
          destinations: rule.destinations ?? [],
          isLastRule: rule.priority === LAST_RULE_PRIORITY,
        }));

        finalRules = updateDisplayPriorities([...finalRules, ...newRules], pageMinVisibleIndex - 1);
      }
    }
    setTotalRulesCount(count => count - 1); // Decrement total count for deleted rule
    setRules(finalRules);
    setModifiedRules(newMap);
  }, [rules, hasMaxPendingChanges, modifiedRules, pageSize, currentPage]);



  const moveRule = useCallback((fromIdx: number, toIdx: number) => {
    if (hasMaxPendingChanges()) throw new Error("Save or clear changes before adding a new rule");
    if (fromIdx === toIdx) return;
    if (rules[fromIdx].isLastRule || rules[toIdx]?.isLastRule) throw new Error("Cannot move the last fixed rule");
    const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;
    let updated = [...rules];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    const newPriority = calculatePriority(updated, toIdx);
    console.log("New priority:", newPriority);
    updated[toIdx].priority = newPriority;
    updated[toIdx].timestamp = Date.now();
    updated = updateDisplayPriorities(updated, pageMinVisibleIndex - 1);
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
  }, [rules, hasMaxPendingChanges, modifiedRules, currentPage, pageSize]);

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
      ...(rule.tenantId ? { tenantId: rule.tenantId } : {}),
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

      await fetchPage(null, currentPage, pageSize, pageSize);
      setModifiedRules(new Map()); // Clear modified rules after successful save
      toast({
              title: "✅ Save succesfull",
              description: `Rules saved successfully.`,
            });
    } catch (error) {
      console.error("Failed to save rules:", error);
      // Optionnel : show toast, set error state, etc.
    }
  }, [modifiedRules, fetchPage, currentPage, pageSize, hasPendingChanges, toBackendRule]);

  const clearChanges = useCallback(async () => {
      setModifiedRules(new Map());
      const options = { ignoreModifiedRules: true };
      await fetchPage(null, currentPage, pageSize, pageSize, options);
  }, [fetchPage, currentPage, pageSize]);

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
    totalRulesCount,
  };
}
