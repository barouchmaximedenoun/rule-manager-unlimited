import { Prisma, PrismaClient } from '@prisma/client';

declare global {
  // Allow global variable to survive hot-reloads in dev
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

const shutdownSignals = ['SIGINT', 'SIGTERM'];

shutdownSignals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`🧹 Graceful shutdown triggered by ${signal}`);
    await prisma.$disconnect();
    process.exit(0);
  });
});

export { Prisma, prisma };
