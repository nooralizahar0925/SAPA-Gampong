import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Gampong Blang Digital API listening on http://localhost:${env.PORT}/api`);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(async (err) => {
    if (err) console.error('Error while closing HTTP server:', err);
    await prisma.$disconnect();
    process.exit(err ? 1 : 0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
