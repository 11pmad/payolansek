import { describe, expect, it } from 'vitest';
import {
  buildAgeGenderBreakdown,
  buildKelainanBreakdown,
  buildKelurahanRanking,
  buildKemandirianAndService,
  buildMonthlyTrend,
} from '../shared/analytics.js';
import { computeMonthLayanan, computeYearKunjungan } from '../shared/calculations.js';
import type { LayananMonthComputed } from '../shared/types.js';
import { DEFAULT_TEMPLATE_PATH, parseExcelWorkbook } from '../server/excel.js';

describe('Analytics Aggregation Engine', () => {
  it('computes trend, ranking, age/gender, kelainan (month vs YTD), and kemandirian on 2026 data', async () => {
    const report = await parseExcelWorkbook(DEFAULT_TEMPLATE_PATH, 2026);
    const kunjunganYear = computeYearKunjungan(report.kunjungan);
    const layananYear: Record<number, LayananMonthComputed> = {};
    for (let m = 1; m <= 12; m++) {
      layananYear[m] = computeMonthLayanan(m, report.layanan[m]);
    }

    // 1. Monthly trend (all kelurahan vs Payolansek only)
    const trendAll = buildMonthlyTrend(kunjunganYear, null);
    expect(trendAll).toHaveLength(12);
    expect(trendAll[0].komdatTotal).toBe(kunjunganYear[1].totals.komdatTotal);
    expect(trendAll[9].komdatPct).toBeGreaterThan(trendAll[0].komdatPct);

    const trendPayolansek = buildMonthlyTrend(kunjunganYear, 0);
    expect(trendPayolansek[0].komdatTotal).toBe(143);
    expect(trendPayolansek[0].komdatPct).toBeCloseTo(23.2143, 3);

    // 2. Kelurahan ranking sorted descending by komdatPct
    const rankingOkt = buildKelurahanRanking(kunjunganYear[10]);
    expect(rankingOkt).toHaveLength(6);
    for (let i = 1; i < rankingOkt.length; i++) {
      expect(rankingOkt[i - 1].komdatPct).toBeGreaterThanOrEqual(rankingOkt[i].komdatPct);
    }

    // 3. Age & gender breakdown sums cleanly
    const ageGroups = buildAgeGenderBreakdown(kunjunganYear[1], 0);
    expect(ageGroups).toHaveLength(3);
    expect(ageGroups[1].total + ageGroups[2].total).toBe(143);

    // 4. Kelainan breakdown (month vs YTD)
    const kelainanJan = buildKelainanBreakdown(layananYear, 1, 'month', 0);
    const janTotal = kelainanJan.reduce((sum, item) => sum + item.total, 0);
    expect(janTotal).toBe(7); // R12=2, S12=3, Y12=2

    const kelainanYtdOkt = buildKelainanBreakdown(layananYear, 10, 'ytd', null);
    const kelainanOktOnly = buildKelainanBreakdown(layananYear, 10, 'month', null);
    const ytdSum = kelainanYtdOkt.reduce((sum, item) => sum + item.total, 0);
    const oktSum = kelainanOktOnly.reduce((sum, item) => sum + item.total, 0);
    expect(ytdSum).toBeGreaterThanOrEqual(oktSum);

    // 5. Kemandirian & service summary
    const summaryJan = buildKemandirianAndService(kunjunganYear, layananYear, 1, 'month', 0);
    expect(summaryJan.kemandirian.a).toBe(59); // 47 (60-69) + 12 (>70)
    expect(summaryJan.kemandirian.pctA).toBe(100);
    expect(summaryJan.services.find((s) => s.label === 'Diedukasi')?.value).toBe(62);
  });
});
