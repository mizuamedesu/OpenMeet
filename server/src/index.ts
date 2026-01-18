import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import selfsigned from 'selfsigned';
import { setupSocketHandlers } from './socket-handlers.js';
import type { ClientToServerEvents, ServerToClientEvents, ServerConfig } from './types.js';

dotenv.config();

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const USE_HTTPS = process.env.USE_HTTPS !== 'false'; // Default to true for development

function getServerConfig(): ServerConfig {
  return {
    turnEnabled: process.env.TURN_ENABLED === 'true',
    turnUrl: process.env.TURN_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnPassword: process.env.TURN_PASSWORD || '',
  };
}

async function main() {
  const app = express();

  // Generate self-signed certificate for HTTPS
  let httpServer;
  if (USE_HTTPS) {
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = await selfsigned.generate(attrs, { keySize: 2048 });
    httpServer = createHttpsServer({ key: pems.private, cert: pems.cert }, app);
  } else {
    httpServer = createHttpServer(app);
  }

  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ICE servers info endpoint
  app.get('/ice-servers', (_req, res) => {
    const config = getServerConfig();
    const servers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    if (config.turnEnabled && config.turnUrl) {
      servers.push({
        urls: config.turnUrl,
        username: config.turnUsername,
        credential: config.turnPassword,
      } as typeof servers[number]);
    }

    res.json({ iceServers: servers });
  });

  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  setupSocketHandlers(io, getServerConfig());

  httpServer.listen(PORT, () => {
    const protocol = USE_HTTPS ? 'https' : 'http';
    console.log(`OpenMeet signaling server running on ${protocol}://localhost:${PORT}`);
    console.log(`HTTPS enabled: ${USE_HTTPS}`);
    console.log(`TURN enabled: ${process.env.TURN_ENABLED === 'true'}`);
  });
}

main().catch(console.error);
