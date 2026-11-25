import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

function createMockReq(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}) {
  const stream = new Readable({
    read() {
      this.push(null);
    },
  }) as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: unknown;
    socket: { remoteAddress: string };
  };
  stream.method = options.method;
  stream.url = options.url;
  stream.headers = { host: 'payolansek.vercel.app', ...options.headers };
  if (options.body !== undefined) {
    stream.body = options.body;
  }
  stream.socket = { remoteAddress: '127.0.0.1' };
  return stream;
}

function createMockRes() {
  const res = new EventEmitter() as EventEmitter & {
    statusCode: number;
    headers: Record<string, string | string[]>;
    bodyText: string;
    setHeader: (name: string, val: string | string[]) => void;
    getHeader: (name: string) => string | string[] | undefined;
    removeHeader: (name: string) => void;
    writeHead: (status: number, headers?: Record<string, string | string[]>) => unknown;
    write: (chunk: unknown) => boolean;
    end: (chunk?: unknown) => void;
  };
  res.statusCode = 200;
  res.headers = {};
  res.bodyText = '';
  res.setHeader = (name, val) => {
    res.headers[name.toLowerCase()] = val;
  };
  res.getHeader = (name) => res.headers[name.toLowerCase()];
  res.removeHeader = (name) => {
    delete res.headers[name.toLowerCase()];
  };
  res.writeHead = (status, hdrs) => {
    res.statusCode = status;
    if (hdrs) {
      for (const [k, v] of Object.entries(hdrs)) res.setHeader(k, v);
    }
    return res;
  };
  res.write = (chunk) => {
    if (chunk !== undefined && chunk !== null) {
      res.bodyText += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    }
    return true;
  };
  res.end = (chunk) => {
    if (chunk !== undefined && chunk !== null) {
      res.bodyText += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    }
    res.emit('finish');
  };
  return res;
}

describe('Vercel Serverless Handler (api/index.ts)', () => {
  let tmpDir: string;
  let dbClose: (() => Promise<void>) | null = null;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simlansia-vercel-test-'));
  });

  afterAll(async () => {
    if (dbClose) await dbClose();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.resetModules();
  });

  it('handles /api/health and pre-parsed POST /api/auth/login and awaits async response', async () => {
    const dbPath = path.join(tmpDir, 'vercel-test.db');
    vi.doMock('../server/index.js', async () => {
      const actual = await vi.importActual<typeof import('../server/index.js')>('../server/index.js');
      return {
        ...actual,
        createApp: async () => {
          const created = await actual.createApp({ dbPath, autoSeed: false });
          dbClose = () => created.db.close();
          return created;
        },
      };
    });

    const { default: handler } = await import('../api/index.js');

    // 1. GET /api/health
    const reqHealth = createMockReq({ method: 'GET', url: '/api/health' });
    const resHealth = createMockRes();
    await handler(reqHealth as never, resHealth as never);
    expect(resHealth.statusCode).toBe(200);
    const healthJson = JSON.parse(resHealth.bodyText) as {
      ok: boolean;
      storage: string;
      usersCount: number;
    };
    expect(healthJson.ok).toBe(true);
    expect(healthJson.storage).toBe('sqlite');
    expect(healthJson.usersCount).toBe(1);

    // 2. POST /api/auth/login with pre-parsed req.body & x-forwarded-proto: https
    const reqLogin = createMockReq({
      method: 'POST',
      url: '/api/auth/login',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-proto': 'https',
      },
      body: { username: 'admin', password: 'payolansek2026' },
    });
    const resLogin = createMockRes();
    await handler(reqLogin as never, resLogin as never);

    expect(resLogin.statusCode).toBe(200);
    const loginJson = JSON.parse(resLogin.bodyText) as { user: { username: string; role: string } };
    expect(loginJson.user.username).toBe('admin');
    expect(loginJson.user.role).toBe('admin');

    const setCookie = resLogin.headers['set-cookie'];
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : String(setCookie ?? '');
    expect(cookieStr).toContain('simlansia_session=');
    expect(cookieStr).toContain('HttpOnly');
    expect(cookieStr).toContain('Secure');
  });
});
