import { Rule } from "../types/rules";

export function createDummyRules(startOffset = 0, count: number): Rule[] {
    const rules: Rule[] = [];
  
    for (let i = 1; i < count; i++) {
      const index = i + startOffset;
      rules.push({
        id: undefined,
        name: `Dummy Rule ${index}`,
        action: 'Allow',
        priority: index, // ou toute autre logique
        timestamp: Date.now(),
        sources: [
          { name: `Source ${index}`, email: `source${index}@example.com` }
        ],
        destinations: [
          { name: `Dest ${index}`, email: `dest${index}@example.com` }
        ],
      });
    }
  
    return rules;
}