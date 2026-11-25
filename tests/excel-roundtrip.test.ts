import path from 'node:path';
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  buildOfficialExcelWorkbook,
  DEFAULT_TEMPLATE_PATH,
  KUNJUNGAN_SHEET_NAME,
  LAYANAN_SHEET_NAME,
  parseExcelWorkbook,
} from '../server/excel.js';
import { computeMonthLayanan, computeYearKunjungan } from '../shared/calculations.js';

describe('Excel Import & Official Export Round-trip', () => {
  it('imports official template with accurate Jan–Okt values and fixes AM calculation', async () => {
    const parsed = await parseExcelWorkbook(DEFAULT_TEMPLATE_PATH, 2026);
    expect(parsed.puskesmas).toBe('PAYOLANSEK');
    expect(parsed.kota).toBe('PAYAKUMBUH');

    const kunj = computeYearKunjungan(parsed.kunjungan);
    expect(kunj[1].rows[0].sasTotal60).toBe(616);
    expect(kunj[1].rows[0].komdatL).toBe(59);
    expect(kunj[1].rows[0].komdatP).toBe(84);
    expect(kunj[1].rows[0].komdatTotal).toBe(143);
    expect(kunj[1].rows[0].komdatPct).toBeCloseTo(23.2142857, 4);

    // Check Layanan Jan Payolansek: R12=2 (L), S12=3 (P), Y12=2 (P) -> L=2, P=5, Total=7
    const layJan = computeMonthLayanan(1, parsed.layanan[1]);
    expect(layJan.rows[0].sasTotal60).toBe(583);
    expect(layJan.rows[0].kelainanL).toBe(2);
    expect(layJan.rows[0].kelainanP).toBe(5);
    expect(layJan.rows[0].kelainanTotal).toBe(7);
  });

  it('exports official 2-sheet .xlsx fixing original template bugs and preserving round-trip edits', async () => {
    const report = await parseExcelWorkbook(DEFAULT_TEMPLATE_PATH, 2026);

    // Add November data for Payolansek
    report.kunjungan[11][0].dg60_69L = 7;
    report.kunjungan[11][0].lg60_69P = 4;

    const buffer = await buildOfficialExcelWorkbook(report, DEFAULT_TEMPLATE_PATH);
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(buffer as any);

    // Exactly 2 official sheets (Sheet1 removed)
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      KUNJUNGAN_SHEET_NAME,
      LAYANAN_SHEET_NAME,
    ]);

    const wsKunj = wb.getWorksheet(KUNJUNGAN_SHEET_NAME)!;
    const wsLay = wb.getWorksheet(LAYANAN_SHEET_NAME)!;

    // Fixed typos & labels
    expect(wsKunj.getCell('C159').value).toBe(': AGUSTUS');
    expect(wsKunj.getCell('B166').value).toBe('PAYOLANSEK');
    expect(wsKunj.getCell('A17').value).toBe(6);
    expect(wsKunj.getCell('BN21').value).toBe('Payakumbuh, Januari 2026');

    // Safe division formula on BO12
    expect(wsKunj.getCell('BO12').value).toMatchObject({
      formula: 'IF(N12>0,BN12/N12*100,0)',
    });

    // Fixed AM12 formula on Lap. Layanan Lansia (sums P columns, result = 5)
    expect(wsLay.getCell('AM12').value).toMatchObject({
      formula: 'K12+M12+O12+Q12+S12+U12+W12+Y12+AA12+AC12+AE12+AG12+AI12+AK12',
      result: 5,
    });

    // Re-import exported buffer and confirm November edits & December cumulative Lama
    const reimported = await parseExcelWorkbook(buffer, 2026);
    expect(reimported.kunjungan[11][0].dg60_69L).toBe(7);
    expect(reimported.kunjungan[11][0].lg60_69P).toBe(4);

    const recomputedBefore = computeYearKunjungan(report.kunjungan);
    const recomputedAfter = computeYearKunjungan(reimported.kunjungan);
    expect(recomputedAfter[12].rows[0].dg60_69L_Lama).toBe(
      recomputedBefore[12].rows[0].dg60_69L_Lama,
    );
    expect(recomputedAfter[12].rows[0].dg60_69L_Lama).toBe(
      recomputedBefore[11].rows[0].dg60_69L_Lama + 7,
    );

    // Ensure DEFAULT_TEMPLATE_PATH resolves properly
    expect(path.basename(DEFAULT_TEMPLATE_PATH)).toBe('template_laporan_lansia.xlsx');
  });
});
