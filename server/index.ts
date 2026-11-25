import fs from 'node:fs';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import {
  KELURAHAN_LIST,
  type KunjunganInput,
  type LayananInput,
} from '../shared/types.js';
import {
  createEmptyKunjunganInput,
  createEmptyLayananInput,
} from '../shared/calculations.js';
import { ReportDatabase } from './db.js';
import {
  buildOfficialExcelWorkbook,
  DEFAULT_TEMPLATE_PATH,
  parseExcelWorkbook,
} from './excel.js';

export interface AppOptions {
  dbPath?: string;
  templatePath?: string;
  autoSeed?: boolean;
}

export async function createApp(options: AppOptions = {}) {
  const db = new ReportDatabase(options.dbPath);
  const templatePath = options.templatePath ?? DEFAULT_TEMPLATE_PATH;
  const autoSeed = options.autoSeed ?? true;

  if (autoSeed && db.listYears().length === 0 && fs.existsSync(templatePath)) {
    const initial = await parseExcelWorkbook(templatePath, 2026);
    db.saveYearReport(initial);
  }

  const app = express();
  app.use(express.json({ limit: '5mb' }));

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, years: db.listYears().map((y) => y.year) });
  });

  app.get('/api/years', (_req: Request, res: Response) => {
    res.json({ years: db.listYears() });
  });

  app.post('/api/years', (req: Request, res: Response) => {
    const year = Number(req.body?.year);
    const copyFromYear = req.body?.copyFromYear ? Number(req.body.copyFromYear) : undefined;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      res.status(400).json({ error: 'Tahun tidak valid.' });
      return;
    }
    if (db.hasYear(year)) {
      res.status(409).json({ error: `Laporan tahun ${year} sudah ada.` });
      return;
    }
    const created = db.createYear(year, copyFromYear);
    res.status(201).json(created);
  });

  app.get('/api/reports/:year', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const report = db.getYearReport(year);
    if (!report) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }
    res.json(report);
  });

  app.put('/api/reports/:year/kunjungan/:month/:kelurahanIdx', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const kelIdx = Number(req.params.kelurahanIdx);

    if (!db.hasYear(year)) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }
    if (month < 1 || month > 12 || kelIdx < 0 || kelIdx >= KELURAHAN_LIST.length) {
      res.status(400).json({ error: 'Parameter bulan atau kelurahan tidak valid.' });
      return;
    }

    const sanitized: KunjunganInput = {
      ...createEmptyKunjunganInput(),
      ...(req.body as Partial<KunjunganInput>),
    };
    const updatedAt = db.upsertKunjungan(year, month, kelIdx, sanitized);
    res.json({ ok: true, updatedAt, data: sanitized });
  });

  app.put('/api/reports/:year/layanan/:month/:kelurahanIdx', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const kelIdx = Number(req.params.kelurahanIdx);

    if (!db.hasYear(year)) {
      res.status(404).json({ error: `Laporan tahun ${year} tidak ditemukan.` });
      return;
    }
    if (month < 1 || month > 12 || kelIdx < 0 || kelIdx >= KELURAHAN_LIST.length) {
      res.status(400).json({ error: 'Parameter bulan atau kelurahan tidak valid.' });
      return;
    }

    const sanitized: LayananInput = {
      ...createEmptyLayananInput(),
      ...(req.body as Partial<LayananInput>),
      keterangan: typeof req.body?.keterangan === 'string' ? req.body.keterangan : '',
    };
    const updatedAt = db.upsertLayanan(year, month, kelIdx, sanitized);
    res.json({ ok: true, updatedAt, data: sanitized });
  });

  app.post('/api/reports/:year/copy-posyandu', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const targetMonth = Number(req.body?.targetMonth);
    const sourceMonth = Number(req.body?.sourceMonth);
    const kelIdx = req.body?.kelurahanIdx !== undefined ? Number(req.body.kelurahanIdx) : undefined;

    const report = db.getYearReport(year);
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
        : KELURAHAN_LIST.map((k) => k.idx);

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
      db.upsertKunjungan(year, targetMonth, idx, updated);
    }

    res.json(db.getYearReport(year));
  });

  app.put('/api/reports/:year/settings', (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const report = db.getYearReport(year);
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
    db.saveYearReport(report);
    res.json(db.getYearReport(year));
  });

  app.post('/api/reports/:year/import', upload.single('file'), async (req: Request, res: Response) => {
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
      db.saveYearReport(parsed);
      res.json(db.getYearReport(year));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal membaca file Excel.';
      res.status(400).json({ error: msg });
    }
  });

  app.get('/api/reports/:year/export', async (req: Request, res: Response) => {
    try {
      const year = Number(req.params.year);
      const report = db.getYearReport(year);
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

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req: Request, res: Response) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  return { app, db };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const port = Number(process.env.PORT ?? (process.env.NODE_ENV === 'production' ? 3000 : 3001));
  createApp().then(({ app }) => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`SIMLANSIA Payolansek server running on http://localhost:${port}`);
    });
  });
}
