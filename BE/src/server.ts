import { app } from './app';
import { config } from './config';
import { prisma } from './config/database';
import { createServer } from 'node:http';

/*
 * Express 5 can invoke its listen callback on a bind error too. Use the HTTP
 * server's listening event so startup is only reported after a successful bind.
 */
const server = createServer(app);
server.once('listening', () => {
  console.info(`TrackRupee API listening on ${config.host}:${config.port} (${config.nodeEnv}).`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${config.port} is already in use. Stop the existing server or set a different PORT in .env.`);
  } else {
    console.error(`HTTP server error: ${error.code ?? 'UNKNOWN'}`);
  }
  process.exit(1);
});

server.listen(config.port, config.host);

let shuttingDown = false;

/*
 * Stop accepting connections, allow in-flight requests to finish, and bound
 * shutdown time so a deployment cannot hang indefinitely on an open socket.
 */
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`${signal} received; shutting down.`);
  const timeout = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    server.closeAllConnections();
    process.exit(1);
  }, 10_000);
  timeout.unref();

  server.close((error) => {
    if (error) {
      console.error('HTTP server failed to close cleanly.');
      process.exitCode = 1;
    }
    /*
     * Drain HTTP requests before releasing their database pool. Keep the shutdown
     * deadline active while disconnecting so cleanup cannot hang indefinitely.
     */
    void prisma.$disconnect().catch(() => {
      console.error('Database disconnect failed.');
      process.exitCode = 1;
    }).finally(() => clearTimeout(timeout));
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
