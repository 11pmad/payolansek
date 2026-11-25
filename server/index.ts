import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  KELURAHAN_LIST,
  type AuthUser,
  type KunjunganInput,
  type LayananInput,
  type UserRole,
} from '../shared/types.js';
import {
  createEmptyKunjunganInput,
  createEmptyLayananInput,
} from '../shared/calculations.js';
import {
  checkLoginRateLimit,
  clearLoginFailures,
  generateSessionToken,
  hashPassword,
  parseCookies,
  recordLoginFailure,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifyPassword,
} from './auth.js';
import {
  buildOfficialExcelWorkbook,
  DEFAULT_TEMPLATE_PATH,
  parseExcelWorkbook,
} from './excel.js';
import type { ReportStore } from './store.js';

export interface AppOptions {
  dbPath?: string;
  templatePath?: string;
  autoSeed?: boolean;
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers['x-forwarded-proto'];
  const isHttpsProto = Array.isArray(proto) ? proto[0] === 'https' : proto === 'https';
  return Boolean(req.secure || isHttpsProto || process.env.VERCEL === '1');
}

function formatSessionCookie(token: string, maxAgeSec: number, secure: boolean): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

async function openStore(options: AppOptions): Promise<ReportStore> {
  const pgUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!options.dbPath && pgUrl) {
    const { createPostgresStore } = await import('./db-postgres.js');
    return createPostgresStore(pgUrl);
  }
  const { createSqliteStore } = await import('./db.js');
  return createSqliteStore(options.dbPath);
}

export async function createApp(options: AppOptions = {}) {
  const db = await openStore(options);
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE_PATH;
  const autoSeed = options.autoSeed ?? true;

  if (autoSeed && (await db.listYears()).length === 0 && fs.existsSync(templatePath)) {
    const initial = await parseExcelWorkbook(templatePath, 2026);
    await db.saveYearReport(initial);
  }

  if ((await db.countUsers()) === 0) {
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'payolansek2026';
    await db.createUser({
      username: 'admin',
      passwordHash: hashPassword(defaultPassword),
      fullName: 'Admin Puskesmas',
      role: 'admin',
      kelurahanIdx: null,
    });
  }

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  const getSessionToken = (req: Request): string | null => {
    const cookies = parseCookies(req.headers.cookie);
    return cookies[SESSION_COOKIE_NAME] || null;
  };

  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = getSessionToken(req);
      const user = token ? await db.getSessionUser(token) : null;
      if (!user) {
        res.status(401).json({ error: 'Silakan login terlebih dahulu.' });
        return;
      }
      res.locals.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };

  const requireAdmin = (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as AuthUser | undefined;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Hanya Admin Puskesmas yang dapat melakukan tindakan ini.' });
      return;
    }
    next();
  };

  const canEditKelurahan = (user: AuthUser, kelIdx: number): boolean => {
    if (user.role === 'admin' || user.kelurahanIdx === null) return true;
    return user.kelurahanIdx === kelIdx;
  };

  // --- Public Auth & Health Endpoints ---

  app.get('/api/health', async (_req: Request, res: Response) => {
    const years = await db.listYears();
    res.json({ ok: true, years: years.map((y) => y.year) });
  });

  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    const user = token ? await db.getSessionUser(token) : null;
    res.json({ user });
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const rate = checkLoginRateLimit(ip);
    if (!rate.allowed) {
      res.status(429).json({
        error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${rate.retryAfterSec} detik.`,
      });
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi.' });
      return;
    }

    const found = await db.getUserByUsername(username);
    if (!found || !verifyPassword(password, found.passwordHash)) {
      recordLoginFailure(ip);
      res.status(401).json({ error: 'Username atau password salah.' });
      return;
    }

    clearLoginFailures(ip);
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
    await db.createSession(found.id, token, expiresAt);

    const user: AuthUser = {
      id: found.id,
      username: found.username,
      fullName: found.fullName,
      role: found.role,
      kelurahanIdx: found.kelurahanIdx,
    };

    res.setHeader(
      'Set-Cookie',
      formatSessionCookie(token, SESSION_TTL_SECONDS, isSecureRequest(req)),
    );
    res.json({ user });
  });

  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const token = getSessionToken(req);
    if (token) {
      await db.deleteSession(token);
    }
    res.setHeader('Set-Cookie', formatSessionCookie('', 0, isSecureRequest(req)));
    res.json({ ok: true });
  });

  // --- Authenticated Account & User Management ---

  app.post('/api/auth/change-password', requireAuth, async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const currentPassword =
      typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Password lama dan password baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter.' });
      return;
    }

    const record = await db.getUserById(user.id);
    if (!record || !verifyPassword(currentPassword, record.passwordHash)) {
      res.status(400).json({ error: 'Password lama tidak sesuai.' });
      return;
    }

    await db.updateUserPassword(user.id, hashPassword(newPassword));
    res.json({ ok: true });
  });

  app.get('/api/users', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
    res.json({ users: await db.listUsers() });
  });

  app.post('/api/users', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const username =
      typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const role = (req.body?.role === 'admin' ? 'admin' : 'petugas') as UserRole;
    const rawKelIdx = req.body?.kelurahanIdx;
    const kelurahanIdx =
      role === 'admin' || rawKelIdx === null || rawKelIdx === undefined || rawKelIdx === ''
        ? null
        : Number(rawKelIdx);

    if (!username || !/^[a-z0-9._-]{3,32}$/.test(username)) {
      res.status(400).json({
        error: 'Username harus 3–32 karakter (huruf kecil, angka, titik, garis bawah, atau hubung).',
      });
      return;
    }
    if (!fullName) {
      res.status(400).json({ error: 'Nama lengkap petugas wajib diisi.' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password minimal 6 karakter.' });
      return;
    }
    if (
      kelurahanIdx !== null &&
      (!Number.isInteger(kelurahanIdx) || kelurahanIdx < 0 || kelurahanIdx >= KELURAHAN_LIST.length)
    ) {
      res.status(400).json({ error: 'Kelurahan tugas tidak valid.' });
      return;
    }
    if (await db.getUserByUsername(username)) {
      res.status(409).json({ error: `Username "${username}" sudah digunakan.` });
      return;
    }

    const created = await db.createUser({
      username,
      passwordHash: hashPassword(password),
      fullName,
      role,
      kelurahanIdx,
    });
    res.status(201).json({ user: created });
  });

  app.delete('/api/users/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const currentUser = res.locals.user as AuthUser;
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ error: 'ID pengguna tidak valid.' });
      return;
    }
    if (targetId === currentUser.id) {
      res.status(400).json({ error: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang login.' });
      return;
    }

    const target = await db.getUserById(targetId);
    if (!target) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
      return;
    }

    if (target.role === 'admin') {
      const adminCount = (await db.listUsers()).filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Tidak dapat menghapus satu-satunya Admin Puskesmas.' });
        return;
      }
    }

    await db.deleteUser(targetId);
    res.json({ ok: true });
  });

  // --- Protected Report Endpoints ---

  app.get('/api/years', requireAuth, async (_req: Request, res: Response) => {
    res.json({ years: await db.listYears() });
  });

  app.post('/api/years', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const year = Number(req.body?.year);
    const copyFromYear = req.body?.copyFromYear ? Number(req.body.copyFromYear) : undefined;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      res.status(400).json({ error: 'Tahun tidak valid.' });
      return;
    }
    if (await db.hasYear(year)) {
      res.status(409).json({ error: `Laporan tahun ${year} sudah ada.` });
      return;
    }
    const created = await db.createYear(year, copyFromYear);
    res.status(201).json(created);
  });

  app.get('/api/reports/:year', requireAuth, async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const report = await db.getYearReport(year);
    if (!report) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }
    res.json(report);
  });

  app.put(
    '/api/reports/:year/kunjungan/:month/:kelurahanIdx',
    requireAuth,
    async (req: Request, res: Response) => {
      const user = res.locals.user as AuthUser;
      const year = Number(req.params.year);
      const month = Number(req.params.month);
      const kelIdx = Number(req.params.kelurahanIdx);

      if (!(await db.hasYear(year))) {
        res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
        return;
      }
      if (month < 1 || month > 12 || kelIdx < 0 || kelIdx >= KELURAHAN_LIST.length) {
        res.status(400).json({ error: 'Parameter bulan atau kelurahan tidak valid.' });
        return;
      }
      if (!canEditKelurahan(user, kelIdx)) {
        res.status(403).json({
          error: `Akun Anda hanya memiliki akses input untuk Kelurahan ${KELURAHAN_LIST[user.kelurahanIdx!].name}.`,
        });
        return;
      }

      const sanitized: KunjunganInput = {
        ...createEmptyKunjunganInput(),
        ...(req.body as Partial<KunjunganInput>),
      };
      const updatedAt = await db.upsertKunjungan(year, month, kelIdx, sanitized);
      res.json({ ok: true, updatedAt, data: sanitized });
    },
  );

  app.put(
    '/api/reports/:year/layanan/:month/:kelurahanIdx',
    requireAuth,
    async (req: Request, res: Response) => {
      const user = res.locals.user as AuthUser;
      const year = Number(req.params.year);
      const month = Number(req.params.month);
      const kelIdx = Number(req.params.kelurahanIdx);

      if (!(await db.hasYear(year))) {
        res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
        return;
      }
      if (month < 1 || month > 12 || kelIdx < 0 || kelIdx >= KELURAHAN_LIST.length) {
        res.status(400).json({ error: 'Parameter bulan atau kelurahan tidak valid.' });
        return;
      }
      if (!canEditKelurahan(user, kelIdx)) {
        res.status(403).json({
          error: `Akun Anda hanya memiliki akses input untuk Kelurahan ${KELURAHAN_LIST[user.kelurahanIdx!].name}.`,
        });
        return;
      }

      const sanitized: LayananInput = {
        ...createEmptyLayananInput(),
        ...(req.body as Partial<LayananInput>),
        keterangan: typeof req.body?.keterangan === 'string' ? req.body.keterangan : '',
      };
      const updatedAt = await db.upsertLayanan(year, month, kelIdx, sanitized);
      res.json({ ok: true, updatedAt, data: sanitized });
    },
  );

  app.post('/api/reports/:year/copy-posyandu', requireAuth, async (req: Request, res: Response) => {
    const user = res.locals.user as AuthUser;
    const year = Number(req.params.year);
    const targetMonth = Number(req.body?.targetMonth);
    const sourceMonth = Number(req.body?.sourceMonth);
    const kelIdx = req.body?.kelurahanIdx !== undefined ? Number(req.body.kelurahanIdx) : undefined;

    const report = await db.getYearReport(year);
    if (!report) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }
    if (sourceMonth < 1 || sourceMonth > 12 || targetMonth < 1 || targetMonth > 12) {
      res.status(400).json({ error: 'Bulan sumber/tujuan tidak valid.' });
      return;
    }

    const indices =
      kelIdx !== undefined && kelIdx >= 0 && kelIdx < KELURAHAN_LIST.length
        ? [kelIdx]
        : user.role === 'petugas' && user.kelurahanIdx !== null
          ? [user.kelurahanIdx]
          : KELURAHAN_LIST.map((k) => k.idx);

    for (const idx of indices) {
      if (!canEditKelurahan(user, idx)) {
        res.status(403).json({
          error: `Akun Anda hanya memiliki akses input untuk Kelurahan ${KELURAHAN_LIST[user.kelurahanIdx!].name}.`,
        });
        return;
      }
    }

    for (const idx of indices) {
      const src = report.kunjungan[sourceMonth][idx];
      const dst = report.kunjungan[targetMonth][idx];
      const updated: KunjunganInput = {
        ...dst,
        jmlPosyandu: src.jmlPosyandu,
        pemberdayaanLansia: src.pemberdayaanLansia,
        posyanduPtm: src.posyanduPtm,
        jmlKader: src.jmlKader,
        kaderTerlatih: src.kaderTerlatih,
        jmlJkn: src.jmlJkn,
      };
      await db.upsertKunjungan(year, targetMonth, idx, updated);
    }

    res.json(await db.getYearReport(year));
  });

  app.put('/api/reports/:year/settings', requireAuth, requireAdmin, async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const report = await db.getYearReport(year);
    if (!report) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }

    const puskesmas =
      typeof req.body?.puskesmas === 'string' && req.body.puskesmas.trim()
        ? req.body.puskesmas.trim().toUpperCase()
        : report.puskesmas;
    const kota =
      typeof req.body?.kota === 'string' && req.body.kota.trim()
        ? req.body.kota.trim().toUpperCase()
        : report.kota;

    const sasaranKunjungan = req.body?.sasaranKunjungan as
      | Array<Pick<KunjunganInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>>
      | undefined;
    const sasaranLayanan = req.body?.sasaranLayanan as
      | Array<Pick<LayananInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>>
      | undefined;

    for (let m = 1; m <= 12; m++) {
      for (let k = 0; k < KELURAHAN_LIST.length; k++) {
        if (sasaranKunjungan?.[k]) {
          report.kunjungan[m][k] = {
            ...report.kunjungan[m][k],
            ...sasaranKunjungan[k],
          };
        }
        if (sasaranLayanan?.[k]) {
          report.layanan[m][k] = {
            ...report.layanan[m][k],
            ...sasaranLayanan[k],
          };
        }
      }
    }

    report.puskesmas = puskesmas;
    report.kota = kota;
    await db.saveYearReport(report);
    res.json(await db.getYearReport(year));
  });

  app.post(
    '/api/reports/:year/import',
    requireAuth,
    requireAdmin,
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        const year = Number(req.params.year);
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
          res.status(400).json({ error: 'Tahun tidak valid.' });
          return;
        }
        if (!req.file) {
          res.status(400).json({ error: 'Pilih file Excel (.xlsx) terlebih dahulu.' });
          return;
        }
        const parsed = await parseExcelWorkbook(req.file.buffer, year);
        await db.saveYearReport(parsed);
        res.json(await db.getYearReport(year));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel.';
        res.status(400).json({ error: msg });
      }
    },
  );

  app.get('/api/reports/:year/export', requireAuth, async (req: Request, res: Response) => {
    try {
      const year = Number(req.params.year);
      const report = await db.getYearReport(year);
      if (!report) {
        res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
        return;
      }
      const buffer = await buildOfficialExcelWorkbook(report, templatePath);
      const filename = `Laporan_Lansia_Kota_Payakumbuh_Tahun_${year}.xlsx`;
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membuat file Excel.';
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
    res.status(500).json({ error: msg });
  });

  return { app, db };
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001));
  createApp().then(({ app }) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`SIMLANSIA Payolansek server running on http://localhost:${port}`);
    });
  });
}
