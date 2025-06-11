import express from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import rulesRouter from './routes/rules';
import authRouter from './routes/auth';
import { DEFAULT_PRIORITY, Rule } from "./types/rules";


import { WebSocketServer, WebSocket } from 'ws';
import { createDummyRules, insertBatch } from './utils/createDummyRules';
const cors = require('cors');
import cookieParser from 'cookie-parser';
import { authMiddleware } from "./middleware/auth";

const app = express();
app.disable('etag');
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
const prisma = new PrismaClient();

app.use(express.json());

const PORT = process.env.PORT || 4001;

app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use((req, res, next) => {
  const openPaths = ['/api/login', '/api/logout'];
  if (openPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  return authMiddleware(req, res, next); // protection pour les autres routes
});
app.use(rulesRouter);
app.use(authRouter);

async function ensureDefaultRule() {
    const defaultRule = await prisma.rule.findFirst({
      where: { priority: DEFAULT_PRIORITY },
    });
  
    if (!defaultRule) {
      await prisma.rule.create({
        data: {
          tenantId: null,
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
async function resetRules(tenantId: string) {
  await prisma.source.deleteMany({
    where: {
      rule: {
        tenantId,
      },
    },
  });

  await prisma.destination.deleteMany({
    where: {
      rule: {
        tenantId,
      },
    },
  });
  
  await prisma.rule.deleteMany({ 
    where: { 
      tenantId 
    } 
  });

  await ensureDefaultRule();
}
async function startServer() {
  try {
    const wss = new WebSocketServer({ noServer: true });
    const maxConcurrentBatches = 5; // Number of concurrent batches to run

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (message: string) => {
        const { count, tenantId } = JSON.parse(message.toString());
        const batchSize = 20;
        let created = 0;
        let nextStart = 0;
        // arrays to keep track of running batches
        const runningBatches: Promise<void>[] = [];

        // Before starting, we delete the rules for the tenant
        ws.send(JSON.stringify({ message: `deleting previous rules for ${tenantId}, this can take a while, 30 mins ... be very patient we are not stale :)` }));
        await resetRules(tenantId);

        // Fonction who inserts a batch of rules
        async function insertBatch(start: number, size: number) {
          const batch = createDummyRules(start, size);
          for (const rule of batch) {
            await prisma.rule.create({
              data: {
                tenantId,
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
        }
        while (created < count || runningBatches.length > 0) {
        while (runningBatches.length < maxConcurrentBatches && nextStart < count) {
          const size = Math.min(batchSize, count - nextStart);
          const batchStart = nextStart;
          nextStart += size;

          const promise = insertBatch(batchStart, size).then(() => {
            created += size;

            // ✅ Sécurise ws.send
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ progress: created / count }));
            }

            // clean liste
            const index = runningBatches.indexOf(promise);
            if (index >= 0) runningBatches.splice(index, 1);
          });

          runningBatches.push(promise);
        }

        if (runningBatches.length > 0) {
          await Promise.race(runningBatches);
        }
      }

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ done: true }));
      }
        
    });
  });
  await ensureDefaultRule();
  // Démarrage du serveur HTTP + WebSocket
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
