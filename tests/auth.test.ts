import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../server/auth.js';
import { createApp } from '../server/index.js';

describe('Authentication & RBAC', () => {
  let tmpDir: string;
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simlansia-auth-test-'));
    const dbPath = path.join(tmpDir, 'test.db');
    const { app, db } = await createApp({ dbPath, autoSeed: false });

    await new Promise<void>((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        closeServer = () =>
          new Promise<void>((res) => {
            server.close(() => {
              db.close();
              res();
            });
          });
        resolve();
      });
    });
  });

  afterAll(async () => {
    await closeServer();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('hashes and verifies passwords with scrypt', () => {
    const hashed = hashPassword('rahasia123');
    expect(hashed.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('rahasia123', hashed)).toBe(true);
    expect(verifyPassword('salah', hashed)).toBe(false);
    expect(verifyPassword('rahasia123', 'invalid-hash')).toBe(false);
  });

  it('protects report routes, enforces RBAC for kelurahan petugas, and supports logout', async () => {
    // 1. Unauthenticated requests
    const unauthYears = await fetch(`${baseUrl}/api/years`);
    expect(unauthYears.status).toBe(401);

    const meAnon = await fetch(`${baseUrl}/api/auth/me`);
    expect(meAnon.status).toBe(200);
    expect(await meAnon.json()).toEqual({ user: null });

    // 2. Wrong password rejected
    const badLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    });
    expect(badLogin.status).toBe(401);

    // 3. Valid admin login
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'payolansek2026' }),
    });
    expect(adminLogin.status).toBe(200);
    const adminCookie = adminLogin.headers.get('set-cookie')?.split(';')[0] ?? '';
    expect(adminCookie).toContain('simlansia_session=');

    const meAdmin = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: adminCookie },
    });
    const meAdminBody = (await meAdmin.json()) as { user: { username: string; role: string } };
    expect(meAdminBody.user.username).toBe('admin');
    expect(meAdminBody.user.role).toBe('admin');

    // 4. Admin creates year 2026 and a kelurahan-scoped petugas (Bulba idx=1)
    const createYearRes = await fetch(`${baseUrl}/api/years`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ year: 2026 }),
    });
    expect(createYearRes.status).toBe(201);

    const createPetugasRes = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        username: 'petugas.bulba',
        password: 'bulba2026',
        fullName: 'Bidan Bulba',
        role: 'petugas',
        kelurahanIdx: 1,
      }),
    });
    expect(createPetugasRes.status).toBe(201);

    // 5. Petugas logs in
    const petugasLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'petugas.bulba', password: 'bulba2026' }),
    });
    expect(petugasLogin.status).toBe(200);
    const petugasCookie = petugasLogin.headers.get('set-cookie')?.split(';')[0] ?? '';

    // Allowed: read years and edit Bulba (idx=1)
    expect((await fetch(`${baseUrl}/api/years`, { headers: { Cookie: petugasCookie } })).status).toBe(200);
    expect(
      (
        await fetch(`${baseUrl}/api/reports/2026/kunjungan/1/1`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: petugasCookie },
          body: JSON.stringify({ dg60_69L: 5 }),
        })
      ).status,
    ).toBe(200);

    // Forbidden: edit Payolansek (idx=0), create year, or list users
    expect(
      (
        await fetch(`${baseUrl}/api/reports/2026/kunjungan/1/0`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Cookie: petugasCookie },
          body: JSON.stringify({ dg60_69L: 5 }),
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await fetch(`${baseUrl}/api/years`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Cookie: petugasCookie },
          body: JSON.stringify({ year: 2027 }),
        })
      ).status,
    ).toBe(403);
    expect((await fetch(`${baseUrl}/api/users`, { headers: { Cookie: petugasCookie } })).status).toBe(403);

    // 6. Logout invalidates session
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: petugasCookie },
    });
    expect(logoutRes.status).toBe(200);
    expect((await fetch(`${baseUrl}/api/years`, { headers: { Cookie: petugasCookie } })).status).toBe(401);
  });
});
