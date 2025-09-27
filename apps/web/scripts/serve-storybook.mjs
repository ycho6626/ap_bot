#!/usr/bin/env node
import http from 'http';
import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? '6006');
const HOST = process.env.HOST ?? '127.0.0.1';
const ROOT = path.resolve(__dirname, '..', 'storybook-static');

const CONTENT_TYPE_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

async function resolveFile(urlPath) {
  if (!urlPath || urlPath === '/') {
    return path.join(ROOT, 'index.html');
  }

  const safePath = urlPath.split('?')[0].split('#')[0];
  const fullPath = path.join(ROOT, decodeURIComponent(safePath));

  try {
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return path.join(fullPath, 'index.html');
    }
    return fullPath;
  } catch (error) {
    if (!path.extname(fullPath)) {
      const fallback = path.join(ROOT, 'index.html');
      const fallbackStats = await fs.stat(fallback);
      if (fallbackStats.isFile()) {
        return fallback;
      }
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const filePath = await resolveFile(req.url ?? '/');
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    if (process.env.DEBUG) {
      console.error('Static server error:', error);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Storybook static server running at http://${HOST}:${PORT}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
