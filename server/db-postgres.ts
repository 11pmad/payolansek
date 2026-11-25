import { Pool, type PoolClient } from 'pg';
import {
  KELURAHAN_LIST,
  type AuthUser,
  type KunjunganInput,
  type LayananInput,
  type UserRecord,
  type UserRole,
  type YearReportData,
  type YearSummary,
} from '../shared/types.js';
import {
  createEmptyKunjunganInput,
  createEmptyLayananInput,
} from '../shared/calculations.js';
import type { ReportStore, StoredAuthUser } from './store.js';

function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function isLocalConnection(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export async function createPostgresStore(connectionString: string): Promise<ReportStore> {
  const pool = new Pool({
    connectionString,
    ssl: isLocalConnection(connectionString) ? false : { rejectUnauthorized: false },
    max: 5,
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_years (
      year INTEGER PRIMARY KEY,
      puskesmas TEXT NOT NULL,
      kota TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kunjungan_entries (
      year INTEGER NOT NULL REFERENCES report_years(year) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      kelurahan_idx INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (year, month, kelurahan_idx)
    );
    CREATE TABLE IF NOT EXISTS layanan_entries (
      year INTEGER NOT NULL REFERENCES report_years(year) ON DELETE CASCADE,
      month INTEGER NOT NULL,
      kelurahan_idx INTEGER NOT NULL,
      data_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (year, month, kelurahan_idx)
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'petugas')),
      kelurahan_idx INTEGER,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);

  async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await fn(client);
      await client.query('COMMIT');
      return res;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const store: ReportStore = {
    async close() {
      await pool.end();
    },

    async listYears(): Promise<YearSummary[]> {
      const { rows } = await pool.query<{
        year: number;
        puskesmas: string;
        kota: string;
        updatedAt: unknown;
      }>('SELECT year, puskesmas, kota, updated_at AS "updatedAt" FROM report_years ORDER BY year DESC');
      return rows.map((r) => ({
        year: Number(r.year),
        puskesmas: r.puskesmas,
        kota: r.kota,
        updatedAt: toIso(r.updatedAt),
      }));
    },

    async hasYear(year: number): Promise<boolean> {
      const { rows } = await pool.query('SELECT year FROM report_years WHERE year = $1', [year]);
      return rows.length > 0;
    },

    async getYearReport(year: number): Promise<YearReportData | null> {
      const metaRes = await pool.query<{
        year: number;
        puskesmas: string;
        kota: string;
        updatedAt: unknown;
      }>('SELECT year, puskesmas, kota, updated_at AS "updatedAt" FROM report_years WHERE year = $1', [year]);

      const meta = metaRes.rows[0];
      if (!meta) return null;

      const kunjungan: Record<number, KunjunganInput[]> = {};
      const layanan: Record<number, LayananInput[]> = {};
      for (let m = 1; m <= 12; m++) {
        kunjungan[m] = KELURAHAN_LIST.map(() => createEmptyKunjunganInput());
        layanan[m] = KELURAHAN_LIST.map(() => createEmptyLayananInput());
      }

      const [kRes, lRes] = await Promise.all([
        pool.query<{ month: number; kelurahan_idx: number; data_json: string }>(
          'SELECT month, kelurahan_idx, data_json FROM kunjungan_entries WHERE year = $1',
          [year],
        ),
        pool.query<{ month: number; kelurahan_idx: number; data_json: string }>(
          'SELECT month, kelurahan_idx, data_json FROM layanan_entries WHERE year = $1',
          [year],
        ),
      ]);

      for (const r of kRes.rows) {
        if (
          r.month >= 1 &&
          r.month <= 12 &&
          r.kelurahan_idx >= 0 &&
          r.kelurahan_idx < KELURAHAN_LIST.length
        ) {
          kunjungan[r.month][r.kelurahan_idx] = {
            ...createEmptyKunjunganInput(),
            ...(JSON.parse(r.data_json) as Partial<KunjunganInput>),
          };
        }
      }

      for (const r of lRes.rows) {
        if (
          r.month >= 1 &&
          r.month <= 12 &&
          r.kelurahan_idx >= 0 &&
          r.kelurahan_idx < KELURAHAN_LIST.length
        ) {
          layanan[r.month][r.kelurahan_idx] = {
            ...createEmptyLayananInput(),
            ...(JSON.parse(r.data_json) as Partial<LayananInput>),
          };
        }
      }

      return {
        year: Number(meta.year),
        puskesmas: meta.puskesmas,
        kota: meta.kota,
        updatedAt: toIso(meta.updatedAt),
        kunjungan,
        layanan,
      };
    },

    async saveYearReport(report: YearReportData): Promise<void> {
      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO report_years (year, puskesmas, kota, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (year) DO UPDATE SET
             puskesmas = EXCLUDED.puskesmas,
             kota = EXCLUDED.kota,
             updated_at = EXCLUDED.updated_at`,
          [report.year, report.puskesmas, report.kota, now, now],
        );

        for (let m = 1; m <= 12; m++) {
          const kArr = report.kunjungan[m] ?? [];
          const lArr = report.layanan[m] ?? [];
          for (let k = 0; k < KELURAHAN_LIST.length; k++) {
            await client.query(
              `INSERT INTO kunjungan_entries (year, month, kelurahan_idx, data_json, updated_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (year, month, kelurahan_idx) DO UPDATE SET
                 data_json = EXCLUDED.data_json,
                 updated_at = EXCLUDED.updated_at`,
              [report.year, m, k, JSON.stringify(kArr[k] ?? createEmptyKunjunganInput()), now],
            );
            await client.query(
              `INSERT INTO layanan_entries (year, month, kelurahan_idx, data_json, updated_at)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (year, month, kelurahan_idx) DO UPDATE SET
                 data_json = EXCLUDED.data_json,
                 updated_at = EXCLUDED.updated_at`,
              [report.year, m, k, JSON.stringify(lArr[k] ?? createEmptyLayananInput()), now],
            );
          }
        }
      });
    },

    async upsertKunjungan(
      year: number,
      month: number,
      kelurahanIdx: number,
      data: KunjunganInput,
    ): Promise<string> {
      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO kunjungan_entries (year, month, kelurahan_idx, data_json, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (year, month, kelurahan_idx) DO UPDATE SET
             data_json = EXCLUDED.data_json,
             updated_at = EXCLUDED.updated_at`,
          [year, month, kelurahanIdx, JSON.stringify(data), now],
        );
        await client.query('UPDATE report_years SET updated_at = $1 WHERE year = $2', [now, year]);
      });
      return now;
    },

    async upsertLayanan(
      year: number,
      month: number,
      kelurahanIdx: number,
      data: LayananInput,
    ): Promise<string> {
      const now = new Date().toISOString();
      await withTransaction(async (client) => {
        await client.query(
          `INSERT INTO layanan_entries (year, month, kelurahan_idx, data_json, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (year, month, kelurahan_idx) DO UPDATE SET
             data_json = EXCLUDED.data_json,
             updated_at = EXCLUDED.updated_at`,
          [year, month, kelurahanIdx, JSON.stringify(data), now],
        );
        await client.query('UPDATE report_years SET updated_at = $1 WHERE year = $2', [now, year]);
      });
      return now;
    },

    async createYear(year: number, copyFromYear?: number): Promise<YearReportData> {
      const source = copyFromYear ? await store.getYearReport(copyFromYear) : null;
      const kunjungan: Record<number, KunjunganInput[]> = {};
      const layanan: Record<number, LayananInput[]> = {};

      for (let m = 1; m <= 12; m++) {
        kunjungan[m] = KELURAHAN_LIST.map((_, k) => {
          const empty = createEmptyKunjunganInput();
          if (!source) return empty;
          const srcRow = source.kunjungan[1]?.[k] ?? createEmptyKunjunganInput();
          return {
            ...empty,
            jmlPosyandu: srcRow.jmlPosyandu,
            pemberdayaanLansia: srcRow.pemberdayaanLansia,
            posyanduPtm: srcRow.posyanduPtm,
            jmlKader: srcRow.jmlKader,
            kaderTerlatih: srcRow.kaderTerlatih,
            sas45_59L: srcRow.sas45_59L,
            sas45_59P: srcRow.sas45_59P,
            sas60_69L: srcRow.sas60_69L,
            sas60_69P: srcRow.sas60_69P,
            sas70L: srcRow.sas70L,
            sas70P: srcRow.sas70P,
            jmlJkn: srcRow.jmlJkn,
          };
        });

        layanan[m] = KELURAHAN_LIST.map((_, k) => {
          const empty = createEmptyLayananInput();
          if (!source) return empty;
          const srcRow = source.layanan[1]?.[k] ?? createEmptyLayananInput();
          return {
            ...empty,
            sas45_59L: srcRow.sas45_59L,
            sas45_59P: srcRow.sas45_59P,
            sas60_69L: srcRow.sas60_69L,
            sas60_69P: srcRow.sas60_69P,
            sas70L: srcRow.sas70L,
            sas70P: srcRow.sas70P,
          };
        });
      }

      const report: YearReportData = {
        year,
        puskesmas: source?.puskesmas ?? 'PAYOLANSEK',
        kota: source?.kota ?? 'PAYAKUMBUH',
        updatedAt: new Date().toISOString(),
        kunjungan,
        layanan,
      };
      await store.saveYearReport(report);
      return (await store.getYearReport(year))!;
    },

    async countUsers(): Promise<number> {
      const { rows } = await pool.query<{ cnt: string }>('SELECT COUNT(*)::text AS cnt FROM users');
      return Number(rows[0]?.cnt ?? 0);
    },

    async listUsers(): Promise<UserRecord[]> {
      const { rows } = await pool.query<{
        id: number;
        username: string;
        fullName: string;
        role: UserRole;
        kelurahanIdx: number | null;
        createdAt: unknown;
      }>(
        `SELECT id, username, full_name AS "fullName", role, kelurahan_idx AS "kelurahanIdx", created_at AS "createdAt"
         FROM users ORDER BY role ASC, id ASC`,
      );
      return rows.map((r) => ({
        id: Number(r.id),
        username: r.username,
        fullName: r.fullName,
        role: r.role,
        kelurahanIdx: r.kelurahanIdx === null ? null : Number(r.kelurahanIdx),
        createdAt: toIso(r.createdAt),
      }));
    },

    async getUserByUsername(username: string): Promise<StoredAuthUser | null> {
      const normalized = username.trim().toLowerCase();
      const { rows } = await pool.query<StoredAuthUser>(
        `SELECT id, username, full_name AS "fullName", role, kelurahan_idx AS "kelurahanIdx", password_hash AS "passwordHash"
         FROM users WHERE LOWER(username) = $1`,
        [normalized],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        ...r,
        id: Number(r.id),
        kelurahanIdx: r.kelurahanIdx === null ? null : Number(r.kelurahanIdx),
      };
    },

    async getUserById(id: number): Promise<StoredAuthUser | null> {
      const { rows } = await pool.query<StoredAuthUser>(
        `SELECT id, username, full_name AS "fullName", role, kelurahan_idx AS "kelurahanIdx", password_hash AS "passwordHash"
         FROM users WHERE id = $1`,
        [id],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        ...r,
        id: Number(r.id),
        kelurahanIdx: r.kelurahanIdx === null ? null : Number(r.kelurahanIdx),
      };
    },

    async createUser(params: {
      username: string;
      passwordHash: string;
      fullName: string;
      role: UserRole;
      kelurahanIdx: number | null;
    }): Promise<UserRecord> {
      const now = new Date().toISOString();
      const normalizedUsername = params.username.trim().toLowerCase();
      const kelIdx = params.role === 'admin' ? null : params.kelurahanIdx;
      const { rows } = await pool.query<{ id: number }>(
        `INSERT INTO users (username, password_hash, full_name, role, kelurahan_idx, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [normalizedUsername, params.passwordHash, params.fullName.trim(), params.role, kelIdx, now, now],
      );

      return {
        id: Number(rows[0].id),
        username: normalizedUsername,
        fullName: params.fullName.trim(),
        role: params.role,
        kelurahanIdx: kelIdx,
        createdAt: now,
      };
    },

    async updateUserPassword(id: number, passwordHash: string): Promise<void> {
      const now = new Date().toISOString();
      await pool.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
        passwordHash,
        now,
        id,
      ]);
    },

    async deleteUser(id: number): Promise<void> {
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    },

    async createSession(userId: number, token: string, expiresAt: string): Promise<void> {
      const now = new Date().toISOString();
      await pool.query(
        'INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, $4)',
        [token, userId, expiresAt, now],
      );
    },

    async getSessionUser(token: string): Promise<AuthUser | null> {
      const { rows } = await pool.query<AuthUser & { expiresAt: unknown }>(
        `SELECT u.id, u.username, u.full_name AS "fullName", u.role, u.kelurahan_idx AS "kelurahanIdx", s.expires_at AS "expiresAt"
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = $1`,
        [token],
      );

      const row = rows[0];
      if (!row) return null;
      if (Date.parse(toIso(row.expiresAt)) <= Date.now()) {
        await store.deleteSession(token);
        return null;
      }

      return {
        id: Number(row.id),
        username: row.username,
        fullName: row.fullName,
        role: row.role,
        kelurahanIdx: row.kelurahanIdx === null ? null : Number(row.kelurahanIdx),
      };
    },

    async deleteSession(token: string): Promise<void> {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    },

    async deleteUserSessions(userId: number): Promise<void> {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    },
  };

  return store;
}
