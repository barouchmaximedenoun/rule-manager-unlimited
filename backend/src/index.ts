import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import rulesRouter from './routes/rules';

import { WebSocketServer, WebSocket } from 'ws';
import { createDummyRules } from './utils/createDummyRules';


const app = express();
const prisma = new PrismaClient();

app.use(express.json());

const PORT = process.env.PORT || 4000;

app.use(rulesRouter);

async function ensureDefaultRule() {
    const DEFAULT_PRIORITY = 1_000_000_000; // 1 milliard
  
    const defaultRule = await prisma.rule.findFirst({
      where: { priority: DEFAULT_PRIORITY },
    });
  
    if (!defaultRule) {
      await prisma.rule.create({
        data: {
          name: 'Allow',
          action: 'default-action', // adapte selon ton cas
          priority: DEFAULT_PRIORITY,
          timestamp: Math.floor(Date.now() / 1000),
          sources: {
            create: [], // tu peux ajouter des sources par défaut si besoin
          },
          destinations: {
            create: [], // idem pour destinations
          },
        },
      });
      console.log('Default rule created.');
    } else {
      console.log('Default rule already exists.');
    }
}


async function startServer() {
    try {
      const wss = new WebSocketServer({ noServer: true });
      wss.on('connection', (ws: WebSocket) => {
        ws.on('message', async (message: string) => {
          const { count } = JSON.parse(message.toString());
          const batchSize = 20;
          let created = 0;

          while (created < count) {
            const batch = createDummyRules(created, Math.min(batchSize, count - created)); 
            //await prisma.rule.createMany({ data: batch });
            for (const rule of batch) {
              await prisma.rule.create({
                data: {
                  name: rule.name,
                  action: rule.action,
                  priority: rule.priority,
                  timestamp: rule.timestamp,
                  sources: {
                    create: rule.sources,
                  },
                  destinations: {
                    create: rule.destinations,
                  },
                },
              });
            }
            created += batch.length;
            ws.send(JSON.stringify({ progress: created / count }));
          }

          ws.send(JSON.stringify({ done: true }));
        });
      });
      await ensureDefaultRule();
      const server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
      server.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
          wss.emit('connection', ws, request);
        });
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  
startServer();
  
