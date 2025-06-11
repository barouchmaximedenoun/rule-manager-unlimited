// backend/src/utils/resetRules.ts
import { DEFAULT_PRIORITY } from "../types/rules";
import { prisma } from '../db';
import { WebSocket } from 'ws';
import { MongoClient, ObjectId } from 'mongodb';

const mongoClient = new MongoClient(process.env.DATABASE_URL!); // la même URL que Prisma

export async function ensureDefaultRule() {
  const defaultRule = await prisma.rule.findFirst({
    where: { priority: DEFAULT_PRIORITY },
  });

  if (!defaultRule) {
    await prisma.rule.create({
      data: {
        tenantId: null,
        name: 'Allow',
        action: 'default-action',
        priority: DEFAULT_PRIORITY,
        timestamp: Math.floor(Date.now() / 1000),
        sources: { create: [] },
        destinations: { create: [] },
      },
    });
    console.log('✅ Default rule created.');
  } else {
    console.log('ℹ️ Default rule already exists.');
  }
}

export async function resetRules(tenantId: string, ws?: WebSocket) {
  await mongoClient.connect();
  const db = mongoClient.db(); // nom implicite depuis URI
  const ruleCollection = db.collection("Rule");
  const sourceCollection = db.collection("Source");
  const destinationCollection = db.collection("Destination");

  const totalCount = await ruleCollection.countDocuments({ tenantId });
  let deletedCount = 0;

  // Étape 1 : supprimer toutes les sources liées à ce tenant
  await sourceCollection.deleteMany({ tenantId });
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ deleteProgress: 1 / 3 }));
  }

  // Étape 2 : supprimer toutes les destinations liées à ce tenant
  await destinationCollection.deleteMany({ tenantId });
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ deleteProgress: 2 / 3 }));
  }

  // Étape 3 : suppression en batch des règles
  const BATCH_SIZE = 5000;
  while (true) {
    const rules = await ruleCollection
      .find({ tenantId }, { projection: { _id: 1 } })
      .limit(BATCH_SIZE)
      .toArray();

    if (rules.length === 0) break;

    const ids = rules.map(r => r._id as ObjectId);

    await ruleCollection.deleteMany({ _id: { $in: ids } });
    deletedCount += ids.length;

    if (ws?.readyState === WebSocket.OPEN && totalCount > 0) {
      const deleteProgress = deletedCount / totalCount;
      ws.send(JSON.stringify({
        deleteProgress: (2 / 3) + (deleteProgress / 3),
      }));
    }
  }

  await ensureDefaultRule();
}
