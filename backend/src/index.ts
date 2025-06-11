import express from 'express';
import rulesRouter from './routes/rules';
import authRouter from './routes/auth';
import { WebSocketServer, WebSocket } from 'ws';
import { createDummyRules } from './utils/createDummyRules';
import { getDb } from './db/mongoClient';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authMiddleware } from './middleware/auth';
import { ensureDefaultRule, resetRules } from './utils/resetRules';

const app = express();
app.disable('etag');
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

const PORT = process.env.PORT || 4001;

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

app.use((req, res, next) => {
  const openPaths = ['/api/login', '/api/logout'];
  if (openPaths.some(path => req.path.startsWith(path))) return next();
  return authMiddleware(req, res, next);
});

app.use(rulesRouter);
app.use(authRouter);

async function startServer() {
  try {
    const db = await getDb();
    // const rulesCollection = db.collection('rules'); // bug fixe
    const rulesCollection = db.collection('Rule');

    const wss = new WebSocketServer({ noServer: true });
    const maxConcurrentBatches = 5;

    wss.on('connection', (ws: WebSocket) => {
      ws.on('message', async (message: string) => {
        const { count, tenantId } = JSON.parse(message.toString());
        console.log(`Received request to create ${count} dummy rules for tenant ${tenantId}`);
        const batchSize = 20;
        let created = 0;
        let nextStart = 0;
        const runningBatches: Promise<void>[] = [];

        ws.send(JSON.stringify({ message: `Deleting previous rules for ${tenantId}...` }));
        await rulesCollection.deleteMany({ tenantId });

        // Helper pour retirer les champs undefined (optionnel)
        function stripUndefined(obj: Record<string, any>) {
          return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined));
        }
        async function insertBatch(start: number, size: number, tenantId: string, rulesCollection: any) {
          const batch = Array.from(createDummyRules(start, size)).map(rule =>
            stripUndefined({
              tenantId,
              ...rule,
            })
          );
          console.log(`Inserting batch from ${start} size ${size} for tenant ${tenantId}`);
          await rulesCollection.insertMany(batch);
        }

        while (created < count || runningBatches.length > 0) {
          while (runningBatches.length < maxConcurrentBatches && nextStart < count) {
            const size = Math.min(batchSize, count - nextStart);
            const batchStart = nextStart;
            nextStart += size;

            const promise = insertBatch(batchStart, size, tenantId, rulesCollection).then(() => {
              created += size;
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ progress: created / count }));
              }
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
