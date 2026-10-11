import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

const app = express();

const defaultOrigin = process.env.NODE_ENV === 'production'
  ? process.env.RENDER_EXTERNAL_URL
  : 'http://localhost:5180';
const allowedOrigins = [process.env.CLIENT_ORIGIN, defaultOrigin]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use('/api', cors({ origin: allowedOrigins }));
app.use(express.json());

app.use('/api', apiRoutes);
app.use('/api', notFound);

// In production the built React app is served from the same server.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('/{*splat}', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

export default app;
