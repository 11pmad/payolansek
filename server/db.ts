import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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

const DEFAULT_DB_PATH = path.resolve(process.cwd(), 'data', 'lansia.db');

export class ReportDatabase {
  private db: DatabaseSync;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS report_years (
        year INTEGER PRIMARY KEY,
        puskesmas TEXT NOT NULL,
        kota TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS kunjungan_entries (
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        kelurahan_idx INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (year, month, kelurahan_idx),
        FOREIGN KEY (year) REFERENCES report_years(year) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS layanan_entries (
        year INTEGER NOT NULL,
        month INTEGER NOT NULL,
        kelurahan_idx INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (year, month, kelurahan_idx),
        FOREIGN KEY (year) REFERENCES report_years(year) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'petugas')),
        kelurahan_idx INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  }

  close(): void {
    this.db.close();
  }

  listYears(): YearSummary[] {
    const stmt = this.db.prepare(
      'SELECT year, puskesmas, kota, updated_at as updatedAt FROM report_years ORDER BY year DESC',
    );
    return stmt.all() as unknown as YearSummary[];
  }

  hasYear(year: number): boolean {
    const row = this.db.prepare('SELECT year FROM report_years WHERE year = ?').get(year);
    return Boolean(row);
  }

  getYearReport(year: number): YearReportData | null {
    const meta = this.db
      .prepare('SELECT year, puskesmas, kota, updated_at as updatedAt FROM report_years WHERE year = ?')
      .get(year) as { year: number; puskesmas: string; kota: string; updatedAt: string } | undefined;

    if (!meta) return null;

    const kunjungan: Record<number, KunjunganInput[]> = {};
    const layanan: Record<number, LayananInput[]> = {};
    for (let m = 1; m <= 12; m++) {
      kunjungan[m] = KELURAHAN_LIST.map(() => createEmptyKunjunganInput());
      layanan[m] = KELURAHAN_LIST.map(() => createEmptyLayananInput());
    }

    const kRows = this.db
      .prepare('SELECT month, kelurahan_idx, data_json FROM kunjungan_entries WHERE year = ?')
      .all(year) as Array<{ month: number; kelurahan_idx: number; data_json: string }>;

    for (const r of kRows) {
      if (r.month >= 1 && r.month <= 12 && r.kelurahan_idx >= 0 && r.kelurahan_idx < KELURAHAN_LIST.length) {
        kunjungan[r.month][r.kelurahan_idx] = {
          ...createEmptyKunjunganInput(),
          ...(JSON.parse(r.data_json) as Partial<KunjunganInput>),
        };
      }
    }

    const lRows = this.db
      .prepare('SELECT month, kelurahan_idx, data_json FROM layanan_entries WHERE year = ?')
      .all(year) as Array<{ month: number; kelurahan_idx: number; data_json: string }>;

    for (const r of lRows) {
      if (r.month >= 1 && r.month <= 12 && r.kelurahan_idx >= 0 && r.kelurahan_idx < KELURAHAN_LIST.length) {
        layanan[r.month][r.kelurahan_idx] = {
          ...createEmptyLayananInput(),
          ...(JSON.parse(r.data_json) as Partial<LayananInput>),
        };
      }
    }

    return {
      year: meta.year,
      puskesmas: meta.puskesmas,
      kota: meta.kota,
      updatedAt: meta.updatedAt,
      kunjungan,
      layanan,
    };
  }

  saveYearReport(report: YearReportData): void {
    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO report_years (year, puskesmas, kota, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(year) DO UPDATE SET puskesmas = excluded.puskesmas, kota = excluded.kota, updated_at = excluded.updated_at`,
        )
        .run(report.year, report.puskesmas, report.kota, now, now);

      const upsertK = this.db.prepare(
        `INSERT INTO kunjungan_entries (year, month, kelurahan_idx, data_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(year, month, kelurahan_idx) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
      );
      const upsertL = this.db.prepare(
        `INSERT INTO layanan_entries (year, month, kelurahan_idx, data_json, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(year, month, kelurahan_idx) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
      );

      for (let m = 1; m <= 12; m++) {
        const kArr = report.kunjungan[m] ?? [];
        const lArr = report.layanan[m] ?? [];
        for (let k = 0; k < KELURAHAN_LIST.length; k++) {
          upsertK.run(report.year, m, k, JSON.stringify(kArr[k] ?? createEmptyKunjunganInput()), now);
          upsertL.run(report.year, m, k, JSON.stringify(lArr[k] ?? createEmptyLayananInput()), now);
        }
      }

      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  upsertKunjungan(year: number, month: number, kelurahanIdx: number, data: KunjunganInput): string {
    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO kunjungan_entries (year, month, kelurahan_idx, data_json, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(year, month, kelurahan_idx) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
        )
        .run(year, month, kelurahanIdx, JSON.stringify(data), now);

      this.db.prepare('UPDATE report_years SET updated_at = ? WHERE year = ?').run(now, year);
      this.db.exec('COMMIT');
      return now;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  upsertLayanan(year: number, month: number, kelurahanIdx: number, data: LayananInput): string {
    const now = new Date().toISOString();
    this.db.exec('BEGIN');
    try {
      this.db
        .prepare(
          `INSERT INTO layanan_entries (year, month, kelurahan_idx, data_json, updated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(year, month, kelurahan_idx) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
        )
        .run(year, month, kelurahanIdx, JSON.stringify(data), now);

      this.db.prepare('UPDATE report_years SET updated_at = ? WHERE year = ?').run(now, year);
      this.db.exec('COMMIT');
      return now;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  createYear(year: number, copyFromYear?: number): YearReportData {
    const source = copyFromYear ? this.getYearReport(copyFromYear) : null;
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
    this.saveYearReport(report);
    return this.getYearReport(year)!;
  }

  // --- User & Session Methods ---

  countUsers(): number {
    const row = this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
    return row.cnt;
  }

  listUsers(): UserRecord[] {
    return this.db
      .prepare(
        `SELECT id, username, full_name as fullName, role, kelurahan_idx as kelurahanIdx, created_at as createdAt
         FROM users ORDER BY role ASC, id ASC`,
      )
      .all() as unknown as UserRecord[];
  }

  getUserByUsername(
    username: string,
  ): (AuthUser & { passwordHash: string }) | null {
    const normalized = username.trim().toLowerCase();
    const row = this.db
      .prepare(
        `SELECT id, username, full_name as fullName, role, kelurahan_idx as kelurahanIdx, password_hash as passwordHash
         FROM users WHERE LOWER(username) = ?`,
      )
      .get(normalized) as (AuthUser & { passwordHash: string }) | undefined;
    return row ?? null;
  }

  getUserById(id: number): (AuthUser & { passwordHash: string }) | null {
    const row = this.db
      .prepare(
        `SELECT id, username, full_name as fullName, role, kelurahan_idx as kelurahanIdx, password_hash as passwordHash
         FROM users WHERE id = ?`,
      )
      .get(id) as (AuthUser & { passwordHash: string }) | undefined;
    return row ?? null;
  }

  createUser(params: {
    username: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    kelurahanIdx: number | null;
  }): UserRecord {
    const now = new Date().toISOString();
    const normalizedUsername = params.username.trim().toLowerCase();
    const res = this.db
      .prepare(
        `INSERT INTO users (username, password_hash, full_name, role, kelurahan_idx, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        normalizedUsername,
        params.passwordHash,
        params.fullName.trim(),
        params.role,
        params.role === 'admin' ? null : params.kelurahanIdx,
        now,
        now,
      );

    return {
      id: Number(res.lastInsertRowid),
      username: normalizedUsername,
      fullName: params.fullName.trim(),
      role: params.role,
      kelurahanIdx: params.role === 'admin' ? null : params.kelurahanIdx,
      createdAt: now,
    };
  }

  updateUserPassword(id: number, passwordHash: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(passwordHash, now, id);
  }

  deleteUser(id: number): void {
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  createSession(userId: number, token: string, expiresAt: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
      .run(token, userId, expiresAt, now);
  }

  getSessionUser(token: string): AuthUser | null {
    const row = this.db
      .prepare(
        `SELECT u.id, u.username, u.full_name as fullName, u.role, u.kelurahan_idx as kelurahanIdx, s.expires_at as expiresAt
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ?`,
      )
      .get(token) as (AuthUser & { expiresAt: string }) | undefined;

    if (!row) return null;
    if (Date.parse(row.expiresAt) <= Date.now()) {
      this.deleteSession(token);
      return null;
    }

    return {
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      role: row.role,
      kelurahanIdx: row.kelurahanIdx,
    };
  }

  deleteSession(token: string): void {
    this.db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }

  deleteUserSessions(userId: number): void {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }
}
