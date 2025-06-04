import axios from "axios";
import type { ModifiedRule, Rule, RuleUI } from "../types/ruleTypes";

export function getRuleKey(rule: RuleUI): string {
  return rule.id ?? rule.tempId!;
}
export function mergeUniqueKeepFirst<T, U extends string | number>(
  arrays: T[][],
  getKey: (item: T) => U
): T[] {
  const seen = new Set<U>();
  const result: T[] = [];

  for (const arr of arrays) {
    for (const item of arr) {
      const key = getKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }

  return result;
}
export const fetchRulesAt = async (skip: number, take: number, withCredentials = true) => {
  // call your backend to get the rules at visibleIndex = index
  const response = await axios.get<Rule[]>(`/rules?skip=${skip}&take=${take}`, {
    withCredentials,
  });
  return response;
}
export const fetchPriorityAt = async (skip: number, take: number, withCredentials = true) => {
  // call your backend to get the rule at visibleIndex = index
  const response = await fetchRulesAt(skip, take, withCredentials);
  return response.data.map((rule) => (rule?.priority ?? null))
};
// This function computes the real index in the backend based on the visible index target and modified rules.
// it is used to compute priority for rules that are not in the current page, but also to fetch page rules.
// when moving a rule to a new priority we will remove it from the modified rules map before computing the priority.
export function computeVisibleIntoBackenPriorityIndex(
  visibleIndexTarget: number,
  modifiedRulesMap: Map<string, ModifiedRule>,
) {
    const sortedMods = Array.from(modifiedRulesMap.values()).sort(
      (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
    );

    let offset = 0;

    for (const mod of sortedMods) {
      const { originalIndex, newIndex } = mod;
      console.log(`Mod: originalIndex=${originalIndex}, newIndex=${newIndex}, offset=${offset}`);


      if (originalIndex === null && newIndex !== null) {
        if (newIndex < visibleIndexTarget + offset) offset -= 1;
      } else if (originalIndex !== null && newIndex === null && mod.deleted) {
        // If the original index is not null and the new index is null, it means the rule was removed
        // we also add a double check with mod.deleted that we send to backend, we dont remove rules we set its status to deleted
        if (originalIndex < visibleIndexTarget + offset) offset += 1;
      } else if (
        originalIndex !== null &&
        newIndex !== null &&
        originalIndex < visibleIndexTarget + offset &&
        newIndex >= visibleIndexTarget + offset
      ) {
        offset += 1;
      } else if (
        originalIndex !== null &&
        newIndex !== null &&
        originalIndex >= visibleIndexTarget + offset &&
        newIndex < visibleIndexTarget + offset
      ) {
        offset -= 1;
      }
    }
    console.log(`Real index final: ${visibleIndexTarget + offset}`);
    const realIndex = visibleIndexTarget + offset;
    return realIndex;
}
export async function computeOutOfRulesPriority(
  currentPage: number,
  pageSize: number,
  visibleIndexTarget: number,
  modifiedRulesMap: Map<string, ModifiedRule>,
  rules: RuleUI[],
  //fetchPriorityAt: (skip: number, take: number) => Promise<number | null>
): Promise<{ realVisibleIndex: number; priority: number }> {
  const realIndex = computeVisibleIntoBackenPriorityIndex(visibleIndexTarget, modifiedRulesMap);

  const pageMinVisibleIndex = (currentPage - 1) * pageSize + 1;

  // Ensure/Double check the visibleIndexTarget is not after last default rule
  if( visibleIndexTarget > pageMinVisibleIndex + rules.length && rules[rules.length-1].isLastRule) {
    throw new Error("cannot insert rule after the last rule")
  }
  let prev: number = 0, next : number = 0;
  // one priority is before loading page rules, so we need to fetch it
  if (visibleIndexTarget === pageMinVisibleIndex) {
    const res = await fetchPriorityAt(realIndex - 1, 1);
    prev = res[0];
    next = rules[0].priority!; // Assuming the first rule is always present
  }
  // should not happen it is case we already have loaded the rules needed but we should cover all cases
  else if (visibleIndexTarget > pageMinVisibleIndex && visibleIndexTarget < pageMinVisibleIndex + rules.length) {
    const index = visibleIndexTarget - pageMinVisibleIndex;
    prev = rules[index].priority!;
    next = rules[index +1].priority!;
  } else if (visibleIndexTarget === pageMinVisibleIndex + rules.length) {// one priority is after loading page rules
    prev = rules[rules.length -1].priority!;
    const res = await fetchPriorityAt(realIndex, 1);
    next = res[0];
  }else { // both priorities are before loading page rules or after loading page rules
    const res = await fetchPriorityAt(realIndex -1, 2);
    prev = res[0];
    next = res[1];
  }
  // should not happen, for safety and troubleshooting
  if (prev === null || next === null) {
    throw new Error(
      `Impossible de calculer une priorité : ${
        prev === null ? "précédente" : ""
      } ${prev === null && next === null ? "et" : ""} ${
        next === null ? "suivante" : ""
      } introuvable(s).`
    );
  }

  const priority = (prev + next) / 2;

  return {
    realVisibleIndex: realIndex,
    priority,
  };
}

export function computeAdjustedSkipAndTake(skip: number, take: number, modifiedRules: Map<string, ModifiedRule>) {
  const realSkip = computeVisibleIntoBackenPriorityIndex(skip, modifiedRules);
  const realUntil = computeVisibleIntoBackenPriorityIndex(skip + take, modifiedRules);
  return { realSkip, realTake: realUntil - realSkip };
}


