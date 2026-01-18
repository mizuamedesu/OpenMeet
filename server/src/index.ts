import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupSocketHandlers } from './socket-handlers.js';
import type { ClientToServerEvents, ServerToClientEvents, ServerConfig } from './types.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

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

function getServerConfig(): ServerConfig {
  return {
    turnEnabled: process.env.TURN_ENABLED === 'true',
    turnUrl: process.env.TURN_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnPassword: process.env.TURN_PASSWORD || '',
  };
}

setupSocketHandlers(io, getServerConfig());

httpServer.listen(PORT, () => {
  console.log(`OpenMeet signaling server running on port ${PORT}`);
  console.log(`TURN enabled: ${process.env.TURN_ENABLED === 'true'}`);
});
