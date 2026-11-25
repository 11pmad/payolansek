import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/index.js';

let appPromise: ReturnType<typeof createApp> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApp().catch((err) => {
      appPromise = null;
      throw err;
    });
  }
  return appPromise;
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; _body?: boolean },
  res: ServerResponse,
) {
  let app: Awaited<ReturnType<typeof createApp>>['app'];
  try {
    ({ app } = await getApp());
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal inisialisasi server.';
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Server init error: ${message}` }));
    return;
  }

  // If Vercel runtime already parsed req.body, tell body-parser not to wait on the stream
  if (req.body !== undefined && req.body !== null && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    req._body = true;
  }

  await new Promise<void>((resolve, reject) => {
    res.once('finish', resolve);
    res.once('close', resolve);
    res.once('error', reject);
    app(req, res);
  });
}
