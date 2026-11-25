import {
  KELURAHAN_LIST,
  MONTH_TITLES,
  type KunjunganComputed,
  type KunjunganMonthComputed,
  type LayananComputed,
  type LayananMonthComputed,
} from './types.js';
import { KELAINAN_DEFINITIONS, n } from './calculations.js';

export interface MonthlyTrendPoint {
  month: number;
  label: string;
  dalamGedungBaru: number;
  luarGedungBaru: number;
  totalBaru: number;
  komdatTotal: number;
  komdatPct: number;
  hasInput: boolean;
}

export interface KelurahanRankItem {
  kelurahanIdx: number;
  name: string;
  sasTotal60: number;
  komdatTotal: number;
  komdatPct: number;
  gapToTarget: number;
  kunjunganBaru: number;
}

export interface KelainanStatItem {
  id: string;
  label: string;
  l: number;
  p: number;
  total: number;
}

export interface AgeGenderGroup {
  ageLabel: string;
  l: number;
  p: number;
  total: number;
  sasaran: number;
}

export interface KemandirianAndServiceSummary {
  kemandirian: {
    a: number;
    b: number;
    c: number;
    total: number;
    pctA: number;
    pctB: number;
    pctC: number;
  };
  services: Array<{ label: string; value: number }>;
}

function pickKunjunganRow(
  monthComputed: KunjunganMonthComputed | undefined,
  kelurahanIdx: number | null,
): KunjunganComputed | null {
  if (!monthComputed) return null;
  if (kelurahanIdx === null) return monthComputed.totals;
  return monthComputed.rows[kelurahanIdx] ?? null;
}

function pickLayananRow(
  monthComputed: LayananMonthComputed | undefined,
  kelurahanIdx: number | null,
): LayananComputed | null {
  if (!monthComputed) return null;
  if (kelurahanIdx === null) return monthComputed.totals;
  return monthComputed.rows[kelurahanIdx] ?? null;
}

export function buildMonthlyTrend(
  kunjunganYear: Record<number, KunjunganMonthComputed>,
  kelurahanIdx: number | null,
): MonthlyTrendPoint[] {
  const points: MonthlyTrendPoint[] = [];
  for (let m = 1; m <= 12; m++) {
    const row = pickKunjunganRow(kunjunganYear[m], kelurahanIdx);
    points.push({
      month: m,
      label: MONTH_TITLES[m - 1].slice(0, 3),
      dalamGedungBaru: row?.dalamGedungBaruBulanIni ?? 0,
      luarGedungBaru: row?.luarGedungBaruBulanIni ?? 0,
      totalBaru: row?.kunjunganBaruBulanIni ?? 0,
      komdatTotal: row?.komdatTotal ?? 0,
      komdatPct: row?.komdatPct ?? 0,
      hasInput: row?.hasInput ?? false,
    });
  }
  return points;
}

export function buildKelurahanRanking(
  kunjunganMonth: KunjunganMonthComputed | undefined,
): KelurahanRankItem[] {
  if (!kunjunganMonth) return [];
  return KELURAHAN_LIST.map((kel) => {
    const row = kunjunganMonth.rows[kel.idx];
    const sasTotal60 = row?.sasTotal60 ?? 0;
    const komdatTotal = row?.komdatTotal ?? 0;
    return {
      kelurahanIdx: kel.idx,
      name: kel.name,
      sasTotal60,
      komdatTotal,
      komdatPct: row?.komdatPct ?? 0,
      gapToTarget: Math.max(0, sasTotal60 - komdatTotal),
      kunjunganBaru: row?.kunjunganBaruBulanIni ?? 0,
    };
  }).sort((a, b) => b.komdatPct - a.komdatPct || b.komdatTotal - a.komdatTotal);
}

export function buildKelainanBreakdown(
  layananYear: Record<number, LayananMonthComputed>,
  upToMonth: number,
  mode: 'month' | 'ytd',
  kelurahanIdx: number | null,
): KelainanStatItem[] {
  const startMonth = mode === 'ytd' ? 1 : upToMonth;
  const totals = new Map<string, { l: number; p: number }>();
  for (const def of KELAINAN_DEFINITIONS) {
    totals.set(def.id, { l: 0, p: 0 });
  }

  for (let m = startMonth; m <= upToMonth; m++) {
    const row = pickLayananRow(layananYear[m], kelurahanIdx);
    if (!row) continue;
    for (const def of KELAINAN_DEFINITIONS) {
      const cur = totals.get(def.id)!;
      cur.l += n(row[def.lKey] as number | null);
      cur.p += n(row[def.pKey] as number | null);
    }
  }

  return KELAINAN_DEFINITIONS.map((def) => {
    const c = totals.get(def.id)!;
    return {
      id: def.id,
      label: def.label,
      l: c.l,
      p: c.p,
      total: c.l + c.p,
    };
  }).sort((a, b) => b.total - a.total);
}

export function buildAgeGenderBreakdown(
  kunjunganMonth: KunjunganMonthComputed | undefined,
  kelurahanIdx: number | null,
): AgeGenderGroup[] {
  const row = pickKunjunganRow(kunjunganMonth, kelurahanIdx);
  if (!row) {
    return [
      { ageLabel: '45–59 Th', l: 0, p: 0, total: 0, sasaran: 0 },
      { ageLabel: '60–69 Th', l: 0, p: 0, total: 0, sasaran: 0 },
      { ageLabel: '> 70 Th', l: 0, p: 0, total: 0, sasaran: 0 },
    ];
  }

  return [
    {
      ageLabel: '45–59 Th',
      l: row.std45_59L_Abs,
      p: row.std45_59P_Abs,
      total: row.std45_59L_Abs + row.std45_59P_Abs,
      sasaran: n(row.sas45_59L) + n(row.sas45_59P),
    },
    {
      ageLabel: '60–69 Th',
      l: row.std60_69L_Abs,
      p: row.std60_69P_Abs,
      total: row.std60_69L_Abs + row.std60_69P_Abs,
      sasaran: n(row.sas60_69L) + n(row.sas60_69P),
    },
    {
      ageLabel: '> 70 Th',
      l: row.std70L_Abs,
      p: row.std70P_Abs,
      total: row.std70L_Abs + row.std70P_Abs,
      sasaran: n(row.sas70L) + n(row.sas70P),
    },
  ];
}

export function buildKemandirianAndService(
  kunjunganYear: Record<number, KunjunganMonthComputed>,
  layananYear: Record<number, LayananMonthComputed>,
  upToMonth: number,
  mode: 'month' | 'ytd',
  kelurahanIdx: number | null,
): KemandirianAndServiceSummary {
  const startMonth = mode === 'ytd' ? 1 : upToMonth;

  let a = 0;
  let b = 0;
  let c = 0;

  let diedukasi = 0;
  let diobati = 0;
  let dirujuk = 0;
  let konseling = 0;
  let penyuluhan = 0;
  let aktifBekerja = 0;
  let homecare = 0;

  for (let m = startMonth; m <= upToMonth; m++) {
    const kRow = pickKunjunganRow(kunjunganYear[m], kelurahanIdx);
    if (kRow) {
      a += n(kRow.kem60_69A) + n(kRow.kem70A);
      b += n(kRow.kem60_69B) + n(kRow.kem70B);
      c += n(kRow.kem60_69C) + n(kRow.kem70C);
    }

    const lRow = pickLayananRow(layananYear[m], kelurahanIdx);
    if (lRow) {
      diedukasi += n(lRow.diedukasi);
      diobati += n(lRow.diobati);
      dirujuk += n(lRow.dirujuk);
      konseling += n(lRow.konselingBaru) + n(lRow.konselingLama) + n(lRow.konselingSelesai);
      penyuluhan += n(lRow.penyuluhan);
      aktifBekerja += n(lRow.aktifBekerja);
      homecare += n(lRow.homecare);
    }
  }

  const total = a + b + c;
  return {
    kemandirian: {
      a,
      b,
      c,
      total,
      pctA: total > 0 ? (a / total) * 100 : 0,
      pctB: total > 0 ? (b / total) * 100 : 0,
      pctC: total > 0 ? (c / total) * 100 : 0,
    },
    services: [
      { label: 'Diedukasi', value: diedukasi },
      { label: 'Diobati', value: diobati },
      { label: 'Penyuluhan', value: penyuluhan },
      { label: 'Konseling', value: konseling },
      { label: 'Aktif Bekerja', value: aktifBekerja },
      { label: 'Dirujuk', value: dirujuk },
      { label: 'Homecare', value: homecare },
    ],
  };
}
