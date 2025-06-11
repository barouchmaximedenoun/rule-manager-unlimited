import { Rule } from "../types/rules";
import { prisma } from '../db';

export function* createDummyRules(startOffset = 0, count: number): Generator<Rule> {
  const baseTimestamp = Date.now();
  for (let i = 1; i <= count; i++) {
    const index = i + startOffset;
    yield {
      id: undefined,
      name: `Dummy Rule ${index}`,
      action: 'Allow',
      priority: index,
      timestamp: baseTimestamp,
      sources: [{ name: `Source ${index}`, email: `source${index}@example.com` }],
      destinations: [{ name: `Dest ${index}`, email: `dest${index}@example.com` }],
    };
  }
}
