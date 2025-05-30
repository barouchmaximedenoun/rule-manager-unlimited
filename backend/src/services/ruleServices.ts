import { prisma, Prisma } from '../db'; 

export async function bulkSaveRules(modifiedRules: any[]) {
    const operations: Prisma.PrismaPromise<any>[] = [];
  
    for (const rule of modifiedRules) {
      if (rule.deleted && rule.id) {
        operations.push(prisma.rule.delete({ where: { id: rule.id } }));
        continue;
      }
  
      const sourceData = rule.sources.map((s: any) => ({ name: s.name, email: s.email }));
      const destData = rule.destinations.map((d: any) => ({ name: d.name, email: d.email }));
  
      if (rule.id) {
        operations.push(prisma.rule.upsert({
          where: { id: rule.id },
          update: {
            action: rule.action,
            name: rule.name,
            priority: rule.priority,
            timestamp: rule.timestamp,
            sources: { deleteMany: {}, create: sourceData },
            destinations: { deleteMany: {}, create: destData },
          },
          create: {
            action: rule.action,
            name: rule.name,
            priority: rule.priority,
            timestamp: rule.timestamp,
            sources: { create: sourceData },
            destinations: { create: destData },
          },
        }));
      } else {
        operations.push(prisma.rule.create({
          data: {
            action: rule.action,
            name: rule.name,
            priority: rule.priority,
            timestamp: rule.timestamp,
            sources: { create: sourceData },
            destinations: { create: destData },
          },
        }));
      }
    }
    return await prisma.$transaction(operations);
  }
  