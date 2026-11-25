import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  KELURAHAN_LIST,
  type KunjunganInput,
  type LayananInput,
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
}
