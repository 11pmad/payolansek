import {
  KELURAHAN_LIST,
  type KunjunganComputed,
  type KunjunganInput,
  type KunjunganMonthComputed,
  type LayananComputed,
  type LayananInput,
  type LayananMonthComputed,
  type NullableNum,
} from './types.js';

export function n(v: NullableNum | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function createEmptyKunjunganInput(): KunjunganInput {
  return {
    jmlPosyandu: null,
    pemberdayaanLansia: null,
    posyanduPtm: null,
    jmlKader: null,
    kaderTerlatih: null,
    sas45_59L: null,
    sas45_59P: null,
    sas60_69L: null,
    sas60_69P: null,
    sas70L: null,
    sas70P: null,
    jmlJkn: null,
    dg45_59L: null,
    dg45_59P: null,
    dg60_69L: null,
    dg60_69P: null,
    dg70L: null,
    dg70P: null,
    lg45_59L: null,
    lg45_59P: null,
    lg60_69L: null,
    lg60_69P: null,
    lg70L: null,
    lg70P: null,
    kem60_69A: null,
    kem60_69B: null,
    kem60_69C: null,
    kem70A: null,
    kem70B: null,
    kem70C: null,
  };
}

export function createEmptyLayananInput(): LayananInput {
  return {
    sas45_59L: null,
    sas45_59P: null,
    sas60_69L: null,
    sas60_69P: null,
    sas70L: null,
    sas70P: null,
    ggnMeL: null,
    ggnMeP: null,
    imtLebihL: null,
    imtLebihP: null,
    imtKurangL: null,
    imtKurangP: null,
    tdTinggiL: null,
    tdTinggiP: null,
    tdRendahL: null,
    tdRendahP: null,
    hbKurangL: null,
    hbKurangP: null,
    kolesterolL: null,
    kolesterolP: null,
    dmL: null,
    dmP: null,
    asamUratL: null,
    asamUratP: null,
    ggnGinjalL: null,
    ggnGinjalP: null,
    ggnKognitifL: null,
    ggnKognitifP: null,
    ggnPenglihatanL: null,
    ggnPenglihatanP: null,
    ggnPendengaranL: null,
    ggnPendengaranP: null,
    lainLainL: null,
    lainLainP: null,
    diedukasi: null,
    diobati: null,
    dirujuk: null,
    konselingBaru: null,
    konselingLama: null,
    konselingSelesai: null,
    penyuluhan: null,
    aktifBekerja: null,
    pantiWredha: null,
    homecare: null,
    keterangan: '',
  };
}

const KUNJUNGAN_ACTIVITY_KEYS: (keyof KunjunganInput)[] = [
  'dg45_59L',
  'dg45_59P',
  'dg60_69L',
  'dg60_69P',
  'dg70L',
  'dg70P',
  'lg45_59L',
  'lg45_59P',
  'lg60_69L',
  'lg60_69P',
  'lg70L',
  'lg70P',
];

export function hasKunjunganActivity(row: KunjunganInput): boolean {
  return KUNJUNGAN_ACTIVITY_KEYS.some((k) => row[k] !== null && row[k] !== undefined);
}

const LAYANAN_ACTIVITY_KEYS: (keyof LayananInput)[] = [
  'ggnMeL', 'ggnMeP',
  'imtLebihL', 'imtLebihP',
  'imtKurangL', 'imtKurangP',
  'tdTinggiL', 'tdTinggiP',
  'tdRendahL', 'tdRendahP',
  'hbKurangL', 'hbKurangP',
  'kolesterolL', 'kolesterolP',
  'dmL', 'dmP',
  'asamUratL', 'asamUratP',
  'ggnGinjalL', 'ggnGinjalP',
  'ggnKognitifL', 'ggnKognitifP',
  'ggnPenglihatanL', 'ggnPenglihatanP',
  'ggnPendengaranL', 'ggnPendengaranP',
  'lainLainL', 'lainLainP',
  'diedukasi', 'diobati', 'dirujuk',
  'konselingBaru', 'konselingLama', 'konselingSelesai',
  'penyuluhan', 'aktifBekerja', 'pantiWredha', 'homecare',
];

export function hasLayananActivity(row: LayananInput): boolean {
  return LAYANAN_ACTIVITY_KEYS.some((k) => row[k] !== null && row[k] !== undefined);
}

export function computeYearKunjungan(
  monthsData: Record<number, KunjunganInput[]>,
): Record<number, KunjunganMonthComputed> {
  const result: Record<number, KunjunganMonthComputed> = {};
  let prevRows: KunjunganComputed[] | null = null;

  for (let m = 1; m <= 12; m++) {
    const rawRows = monthsData[m] ?? KELURAHAN_LIST.map(() => createEmptyKunjunganInput());
    const computedRows: KunjunganComputed[] = [];

    for (let k = 0; k < KELURAHAN_LIST.length; k++) {
      const input = rawRows[k] ?? createEmptyKunjunganInput();
      const prev = prevRows ? prevRows[k] : null;

      // Cumulative Lama = 0 in Jan; prev.lama + prev.baru in Feb..Des
      const dg45_59L_Lama = prev ? prev.dg45_59L_Lama + n(prev.dg45_59L) : 0;
      const dg45_59P_Lama = prev ? prev.dg45_59P_Lama + n(prev.dg45_59P) : 0;
      const dg60_69L_Lama = prev ? prev.dg60_69L_Lama + n(prev.dg60_69L) : 0;
      const dg60_69P_Lama = prev ? prev.dg60_69P_Lama + n(prev.dg60_69P) : 0;
      const dg70L_Lama = prev ? prev.dg70L_Lama + n(prev.dg70L) : 0;
      const dg70P_Lama = prev ? prev.dg70P_Lama + n(prev.dg70P) : 0;

      const lg45_59L_Lama = prev ? prev.lg45_59L_Lama + n(prev.lg45_59L) : 0;
      const lg45_59P_Lama = prev ? prev.lg45_59P_Lama + n(prev.lg45_59P) : 0;
      const lg60_69L_Lama = prev ? prev.lg60_69L_Lama + n(prev.lg60_69L) : 0;
      const lg60_69P_Lama = prev ? prev.lg60_69P_Lama + n(prev.lg60_69P) : 0;
      const lg70L_Lama = prev ? prev.lg70L_Lama + n(prev.lg70L) : 0;
      const lg70P_Lama = prev ? prev.lg70P_Lama + n(prev.lg70P) : 0;

      const sasTotal60 = n(input.sas60_69L) + n(input.sas60_69P) + n(input.sas70L) + n(input.sas70P);

      const tot45_59L_Lama = dg45_59L_Lama + lg45_59L_Lama;
      const tot45_59L_Baru = n(input.dg45_59L) + n(input.lg45_59L);
      const tot45_59P_Lama = dg45_59P_Lama + lg45_59P_Lama;
      const tot45_59P_Baru = n(input.dg45_59P) + n(input.lg45_59P);

      const tot60_69L_Lama = dg60_69L_Lama + lg60_69L_Lama;
      const tot60_69L_Baru = n(input.dg60_69L) + n(input.lg60_69L);
      const tot60_69P_Lama = dg60_69P_Lama + lg60_69P_Lama;
      const tot60_69P_Baru = n(input.dg60_69P) + n(input.lg60_69P);

      const tot70L_Lama = dg70L_Lama + lg70L_Lama;
      const tot70L_Baru = n(input.dg70L) + n(input.lg70L);
      const tot70P_Lama = dg70P_Lama + lg70P_Lama;
      const tot70P_Baru = n(input.dg70P) + n(input.lg70P);

      const std45_59L_Baru = tot45_59L_Baru;
      const std45_59L_Abs = tot45_59L_Lama + tot45_59L_Baru;
      const std45_59P_Baru = tot45_59P_Baru;
      const std45_59P_Abs = tot45_59P_Lama + tot45_59P_Baru;

      const std60_69L_Baru = tot60_69L_Baru;
      const std60_69L_Abs = tot60_69L_Lama + tot60_69L_Baru;
      const std60_69P_Baru = tot60_69P_Baru;
      const std60_69P_Abs = tot60_69P_Lama + tot60_69P_Baru;

      const std70L_Baru = tot70L_Baru;
      const std70L_Abs = tot70L_Lama + tot70L_Baru;
      const std70P_Baru = tot70P_Baru;
      const std70P_Abs = tot70P_Lama + tot70P_Baru;

      const komdatL = std60_69L_Abs + std70L_Abs;
      const komdatP = std60_69P_Abs + std70P_Abs;
      const komdatTotal = komdatL + komdatP;
      const komdatPct = sasTotal60 > 0 ? (komdatTotal / sasTotal60) * 100 : 0;

      const dalamGedungBaruBulanIni =
        n(input.dg45_59L) + n(input.dg45_59P) +
        n(input.dg60_69L) + n(input.dg60_69P) +
        n(input.dg70L) + n(input.dg70P);
      const luarGedungBaruBulanIni =
        n(input.lg45_59L) + n(input.lg45_59P) +
        n(input.lg60_69L) + n(input.lg60_69P) +
        n(input.lg70L) + n(input.lg70P);

      computedRows.push({
        ...input,
        kelurahanIdx: k,
        sasTotal60,
        dg45_59L_Lama,
        dg45_59P_Lama,
        dg60_69L_Lama,
        dg60_69P_Lama,
        dg70L_Lama,
        dg70P_Lama,
        lg45_59L_Lama,
        lg45_59P_Lama,
        lg60_69L_Lama,
        lg60_69P_Lama,
        lg70L_Lama,
        lg70P_Lama,
        tot45_59L_Lama,
        tot45_59L_Baru,
        tot45_59P_Lama,
        tot45_59P_Baru,
        tot60_69L_Lama,
        tot60_69L_Baru,
        tot60_69P_Lama,
        tot60_69P_Baru,
        tot70L_Lama,
        tot70L_Baru,
        tot70P_Lama,
        tot70P_Baru,
        std45_59L_Baru,
        std45_59L_Abs,
        std45_59P_Baru,
        std45_59P_Abs,
        std60_69L_Baru,
        std60_69L_Abs,
        std60_69P_Baru,
        std60_69P_Abs,
        std70L_Baru,
        std70L_Abs,
        std70P_Baru,
        std70P_Abs,
        komdatL,
        komdatP,
        komdatTotal,
        komdatPct,
        dalamGedungBaruBulanIni,
        luarGedungBaruBulanIni,
        kunjunganBaruBulanIni: dalamGedungBaruBulanIni + luarGedungBaruBulanIni,
        hasInput: hasKunjunganActivity(input),
      });
    }

    const totals = sumKunjunganRows(computedRows);
    const filledCount = computedRows.filter((r) => r.hasInput).length;

    result[m] = {
      month: m,
      rows: computedRows,
      totals,
      filledCount,
    };

    prevRows = computedRows;
  }

  return result;
}

function sumKunjunganRows(rows: KunjunganComputed[]): KunjunganComputed {
  const sumField = (fn: (r: KunjunganComputed) => number): number =>
    rows.reduce((acc, r) => acc + fn(r), 0);

  const sasTotal60 = sumField((r) => r.sasTotal60);
  const komdatL = sumField((r) => r.komdatL);
  const komdatP = sumField((r) => r.komdatP);
  const komdatTotal = komdatL + komdatP;
  const komdatPct = sasTotal60 > 0 ? (komdatTotal / sasTotal60) * 100 : 0;

  return {
    kelurahanIdx: -1,
    jmlPosyandu: sumField((r) => n(r.jmlPosyandu)),
    pemberdayaanLansia: sumField((r) => n(r.pemberdayaanLansia)),
    posyanduPtm: sumField((r) => n(r.posyanduPtm)),
    jmlKader: sumField((r) => n(r.jmlKader)),
    kaderTerlatih: sumField((r) => n(r.kaderTerlatih)),
    sas45_59L: sumField((r) => n(r.sas45_59L)),
    sas45_59P: sumField((r) => n(r.sas45_59P)),
    sas60_69L: sumField((r) => n(r.sas60_69L)),
    sas60_69P: sumField((r) => n(r.sas60_69P)),
    sas70L: sumField((r) => n(r.sas70L)),
    sas70P: sumField((r) => n(r.sas70P)),
    jmlJkn: sumField((r) => n(r.jmlJkn)),
    dg45_59L: sumField((r) => n(r.dg45_59L)),
    dg45_59P: sumField((r) => n(r.dg45_59P)),
    dg60_69L: sumField((r) => n(r.dg60_69L)),
    dg60_69P: sumField((r) => n(r.dg60_69P)),
    dg70L: sumField((r) => n(r.dg70L)),
    dg70P: sumField((r) => n(r.dg70P)),
    lg45_59L: sumField((r) => n(r.lg45_59L)),
    lg45_59P: sumField((r) => n(r.lg45_59P)),
    lg60_69L: sumField((r) => n(r.lg60_69L)),
    lg60_69P: sumField((r) => n(r.lg60_69P)),
    lg70L: sumField((r) => n(r.lg70L)),
    lg70P: sumField((r) => n(r.lg70P)),
    kem60_69A: sumField((r) => n(r.kem60_69A)),
    kem60_69B: sumField((r) => n(r.kem60_69B)),
    kem60_69C: sumField((r) => n(r.kem60_69C)),
    kem70A: sumField((r) => n(r.kem70A)),
    kem70B: sumField((r) => n(r.kem70B)),
    kem70C: sumField((r) => n(r.kem70C)),
    sasTotal60,
    dg45_59L_Lama: sumField((r) => r.dg45_59L_Lama),
    dg45_59P_Lama: sumField((r) => r.dg45_59P_Lama),
    dg60_69L_Lama: sumField((r) => r.dg60_69L_Lama),
    dg60_69P_Lama: sumField((r) => r.dg60_69P_Lama),
    dg70L_Lama: sumField((r) => r.dg70L_Lama),
    dg70P_Lama: sumField((r) => r.dg70P_Lama),
    lg45_59L_Lama: sumField((r) => r.lg45_59L_Lama),
    lg45_59P_Lama: sumField((r) => r.lg45_59P_Lama),
    lg60_69L_Lama: sumField((r) => r.lg60_69L_Lama),
    lg60_69P_Lama: sumField((r) => r.lg60_69P_Lama),
    lg70L_Lama: sumField((r) => r.lg70L_Lama),
    lg70P_Lama: sumField((r) => r.lg70P_Lama),
    tot45_59L_Lama: sumField((r) => r.tot45_59L_Lama),
    tot45_59L_Baru: sumField((r) => r.tot45_59L_Baru),
    tot45_59P_Lama: sumField((r) => r.tot45_59P_Lama),
    tot45_59P_Baru: sumField((r) => r.tot45_59P_Baru),
    tot60_69L_Lama: sumField((r) => r.tot60_69L_Lama),
    tot60_69L_Baru: sumField((r) => r.tot60_69L_Baru),
    tot60_69P_Lama: sumField((r) => r.tot60_69P_Lama),
    tot60_69P_Baru: sumField((r) => r.tot60_69P_Baru),
    tot70L_Lama: sumField((r) => r.tot70L_Lama),
    tot70L_Baru: sumField((r) => r.tot70L_Baru),
    tot70P_Lama: sumField((r) => r.tot70P_Lama),
    tot70P_Baru: sumField((r) => r.tot70P_Baru),
    std45_59L_Baru: sumField((r) => r.std45_59L_Baru),
    std45_59L_Abs: sumField((r) => r.std45_59L_Abs),
    std45_59P_Baru: sumField((r) => r.std45_59P_Baru),
    std45_59P_Abs: sumField((r) => r.std45_59P_Abs),
    std60_69L_Baru: sumField((r) => r.std60_69L_Baru),
    std60_69L_Abs: sumField((r) => r.std60_69L_Abs),
    std60_69P_Baru: sumField((r) => r.std60_69P_Baru),
    std60_69P_Abs: sumField((r) => r.std60_69P_Abs),
    std70L_Baru: sumField((r) => r.std70L_Baru),
    std70L_Abs: sumField((r) => r.std70L_Abs),
    std70P_Baru: sumField((r) => r.std70P_Baru),
    std70P_Abs: sumField((r) => r.std70P_Abs),
    komdatL,
    komdatP,
    komdatTotal,
    komdatPct,
    dalamGedungBaruBulanIni: sumField((r) => r.dalamGedungBaruBulanIni),
    luarGedungBaruBulanIni: sumField((r) => r.luarGedungBaruBulanIni),
    kunjunganBaruBulanIni: sumField((r) => r.kunjunganBaruBulanIni),
    hasInput: rows.some((r) => r.hasInput),
  };
}

export function computeLayananRow(input: LayananInput, kelurahanIdx: number): LayananComputed {
  const sasTotal60 = n(input.sas60_69L) + n(input.sas60_69P) + n(input.sas70L) + n(input.sas70P);

  const kelainanL =
    n(input.ggnMeL) +
    n(input.imtLebihL) +
    n(input.imtKurangL) +
    n(input.tdTinggiL) +
    n(input.tdRendahL) +
    n(input.hbKurangL) +
    n(input.kolesterolL) +
    n(input.dmL) +
    n(input.asamUratL) +
    n(input.ggnGinjalL) +
    n(input.ggnKognitifL) +
    n(input.ggnPenglihatanL) +
    n(input.ggnPendengaranL) +
    n(input.lainLainL);

  const kelainanP =
    n(input.ggnMeP) +
    n(input.imtLebihP) +
    n(input.imtKurangP) +
    n(input.tdTinggiP) +
    n(input.tdRendahP) +
    n(input.hbKurangP) +
    n(input.kolesterolP) +
    n(input.dmP) +
    n(input.asamUratP) +
    n(input.ggnGinjalP) +
    n(input.ggnKognitifP) +
    n(input.ggnPenglihatanP) +
    n(input.ggnPendengaranP) +
    n(input.lainLainP);

  return {
    ...input,
    kelurahanIdx,
    sasTotal60,
    kelainanL,
    kelainanP,
    kelainanTotal: kelainanL + kelainanP,
    hasInput: hasLayananActivity(input),
  };
}

export function computeMonthLayanan(
  month: number,
  rawRows: LayananInput[],
): LayananMonthComputed {
  const rows = KELURAHAN_LIST.map((_, k) =>
    computeLayananRow(rawRows[k] ?? createEmptyLayananInput(), k),
  );

  const sumField = (fn: (r: LayananComputed) => number): number =>
    rows.reduce((acc, r) => acc + fn(r), 0);

  const kelainanL = sumField((r) => r.kelainanL);
  const kelainanP = sumField((r) => r.kelainanP);

  const totals: LayananComputed = {
    kelurahanIdx: -1,
    sas45_59L: sumField((r) => n(r.sas45_59L)),
    sas45_59P: sumField((r) => n(r.sas45_59P)),
    sas60_69L: sumField((r) => n(r.sas60_69L)),
    sas60_69P: sumField((r) => n(r.sas60_69P)),
    sas70L: sumField((r) => n(r.sas70L)),
    sas70P: sumField((r) => n(r.sas70P)),
    ggnMeL: sumField((r) => n(r.ggnMeL)),
    ggnMeP: sumField((r) => n(r.ggnMeP)),
    imtLebihL: sumField((r) => n(r.imtLebihL)),
    imtLebihP: sumField((r) => n(r.imtLebihP)),
    imtKurangL: sumField((r) => n(r.imtKurangL)),
    imtKurangP: sumField((r) => n(r.imtKurangP)),
    tdTinggiL: sumField((r) => n(r.tdTinggiL)),
    tdTinggiP: sumField((r) => n(r.tdTinggiP)),
    tdRendahL: sumField((r) => n(r.tdRendahL)),
    tdRendahP: sumField((r) => n(r.tdRendahP)),
    hbKurangL: sumField((r) => n(r.hbKurangL)),
    hbKurangP: sumField((r) => n(r.hbKurangP)),
    kolesterolL: sumField((r) => n(r.kolesterolL)),
    kolesterolP: sumField((r) => n(r.kolesterolP)),
    dmL: sumField((r) => n(r.dmL)),
    dmP: sumField((r) => n(r.dmP)),
    asamUratL: sumField((r) => n(r.asamUratL)),
    asamUratP: sumField((r) => n(r.asamUratP)),
    ggnGinjalL: sumField((r) => n(r.ggnGinjalL)),
    ggnGinjalP: sumField((r) => n(r.ggnGinjalP)),
    ggnKognitifL: sumField((r) => n(r.ggnKognitifL)),
    ggnKognitifP: sumField((r) => n(r.ggnKognitifP)),
    ggnPenglihatanL: sumField((r) => n(r.ggnPenglihatanL)),
    ggnPenglihatanP: sumField((r) => n(r.ggnPenglihatanP)),
    ggnPendengaranL: sumField((r) => n(r.ggnPendengaranL)),
    ggnPendengaranP: sumField((r) => n(r.ggnPendengaranP)),
    lainLainL: sumField((r) => n(r.lainLainL)),
    lainLainP: sumField((r) => n(r.lainLainP)),
    diedukasi: sumField((r) => n(r.diedukasi)),
    diobati: sumField((r) => n(r.diobati)),
    dirujuk: sumField((r) => n(r.dirujuk)),
    konselingBaru: sumField((r) => n(r.konselingBaru)),
    konselingLama: sumField((r) => n(r.konselingLama)),
    konselingSelesai: sumField((r) => n(r.konselingSelesai)),
    penyuluhan: sumField((r) => n(r.penyuluhan)),
    aktifBekerja: sumField((r) => n(r.aktifBekerja)),
    pantiWredha: sumField((r) => n(r.pantiWredha)),
    homecare: sumField((r) => n(r.homecare)),
    keterangan: '',
    sasTotal60: sumField((r) => r.sasTotal60),
    kelainanL,
    kelainanP,
    kelainanTotal: kelainanL + kelainanP,
    hasInput: rows.some((r) => r.hasInput),
  };

  return {
    month,
    rows,
    totals,
    filledCount: rows.filter((r) => r.hasInput).length,
  };
}

export function getKunjunganWarnings(row: KunjunganComputed): string[] {
  const warnings: string[] = [];

  if (row.sasTotal60 > 0 && row.komdatTotal > row.sasTotal60) {
    warnings.push(
      `Total dilayani >60 th (${row.komdatTotal}) melebihi Sasaran >60 th (${row.sasTotal60}). Periksa kembali apakah ada kunjungan berulang yang masuk ke kolom Baru.`,
    );
  }

  const kem60 = n(row.kem60_69A) + n(row.kem60_69B) + n(row.kem60_69C);
  const std60 = row.std60_69L_Abs + row.std60_69P_Abs;
  if (kem60 > std60 && std60 > 0) {
    warnings.push(
      `Total Kemandirian usia 60–69 (${kem60}) melebihi kumulatif dilayani usia 60–69 (${std60}).`,
    );
  }

  const kem70 = n(row.kem70A) + n(row.kem70B) + n(row.kem70C);
  const std70 = row.std70L_Abs + row.std70P_Abs;
  if (kem70 > std70 && std70 > 0) {
    warnings.push(
      `Total Kemandirian usia >70 (${kem70}) melebihi kumulatif dilayani usia >70 (${std70}).`,
    );
  }

  return warnings;
}

export const KELAINAN_DEFINITIONS: ReadonlyArray<{
  id: string;
  label: string;
  lKey: keyof LayananInput;
  pKey: keyof LayananInput;
}> = [
  { id: 'ggnMe', label: 'Gangguan Mental Emosional (Ggn ME)', lKey: 'ggnMeL', pKey: 'ggnMeP' },
  { id: 'imtLebih', label: 'IMT Lebih (L)', lKey: 'imtLebihL', pKey: 'imtLebihP' },
  { id: 'imtKurang', label: 'IMT Kurang (K)', lKey: 'imtKurangL', pKey: 'imtKurangP' },
  { id: 'tdTinggi', label: 'Tekanan Darah Tinggi (T)', lKey: 'tdTinggiL', pKey: 'tdTinggiP' },
  { id: 'tdRendah', label: 'Tekanan Darah Rendah (R)', lKey: 'tdRendahL', pKey: 'tdRendahP' },
  { id: 'hbKurang', label: 'Hb Kurang', lKey: 'hbKurangL', pKey: 'hbKurangP' },
  { id: 'kolesterol', label: 'Kolesterol Tinggi', lKey: 'kolesterolL', pKey: 'kolesterolP' },
  { id: 'dm', label: 'Diabetes Melitus (DM)', lKey: 'dmL', pKey: 'dmP' },
  { id: 'asamUrat', label: 'Asam Urat Tinggi', lKey: 'asamUratL', pKey: 'asamUratP' },
  { id: 'ggnGinjal', label: 'Gangguan Ginjal', lKey: 'ggnGinjalL', pKey: 'ggnGinjalP' },
  { id: 'ggnKognitif', label: 'Gangguan Kognitif', lKey: 'ggnKognitifL', pKey: 'ggnKognitifP' },
  { id: 'ggnPenglihatan', label: 'Gangguan Penglihatan', lKey: 'ggnPenglihatanL', pKey: 'ggnPenglihatanP' },
  { id: 'ggnPendengaran', label: 'Gangguan Pendengaran', lKey: 'ggnPendengaranL', pKey: 'ggnPendengaranP' },
  { id: 'lainLain', label: 'Lain-lain', lKey: 'lainLainL', pKey: 'lainLainP' },
] as const;

export type LayananPageId = 'kelainan' | 'pengobatan' | 'lainnya';
export type KunjunganPageId = 'dalam' | 'luar' | 'kemandirian' | 'posyandu';

export interface StepStatusItem<T extends string> {
  id: T;
  label: string;
  filled: boolean;
  filledCount: number;
  totalCount: number;
}

function countFilledFields<T extends object>(row: T, keys: ReadonlyArray<keyof T>): number {
  let cnt = 0;
  for (const k of keys) {
    const val = row[k];
    if (val !== null && val !== undefined) cnt += 1;
  }
  return cnt;
}

const LAYANAN_KELAINAN_KEYS: ReadonlyArray<keyof LayananInput> = [
  'ggnMeL', 'ggnMeP',
  'imtLebihL', 'imtLebihP',
  'imtKurangL', 'imtKurangP',
  'tdTinggiL', 'tdTinggiP',
  'tdRendahL', 'tdRendahP',
  'hbKurangL', 'hbKurangP',
  'kolesterolL', 'kolesterolP',
  'dmL', 'dmP',
  'asamUratL', 'asamUratP',
  'ggnGinjalL', 'ggnGinjalP',
  'ggnKognitifL', 'ggnKognitifP',
  'ggnPenglihatanL', 'ggnPenglihatanP',
  'ggnPendengaranL', 'ggnPendengaranP',
  'lainLainL', 'lainLainP',
];

const LAYANAN_PENGOBATAN_KEYS: ReadonlyArray<keyof LayananInput> = [
  'diedukasi',
  'diobati',
  'dirujuk',
  'konselingBaru',
  'konselingLama',
  'konselingSelesai',
];

const LAYANAN_LAINNYA_KEYS: ReadonlyArray<keyof LayananInput> = [
  'penyuluhan',
  'aktifBekerja',
  'pantiWredha',
  'homecare',
];

export function getLayananStepStatus(row: LayananInput): {
  steps: Record<LayananPageId, StepStatusItem<LayananPageId>>;
  ordered: StepStatusItem<LayananPageId>[];
  emptySteps: StepStatusItem<LayananPageId>[];
} {
  const kCount = countFilledFields(row, LAYANAN_KELAINAN_KEYS);
  const pCount = countFilledFields(row, LAYANAN_PENGOBATAN_KEYS);
  const lCount = countFilledFields(row, LAYANAN_LAINNYA_KEYS);

  const steps: Record<LayananPageId, StepStatusItem<LayananPageId>> = {
    kelainan: {
      id: 'kelainan',
      label: 'Kelainan',
      filled: kCount > 0,
      filledCount: kCount,
      totalCount: LAYANAN_KELAINAN_KEYS.length,
    },
    pengobatan: {
      id: 'pengobatan',
      label: 'Pengobatan',
      filled: pCount > 0,
      filledCount: pCount,
      totalCount: LAYANAN_PENGOBATAN_KEYS.length,
    },
    lainnya: {
      id: 'lainnya',
      label: 'Penyuluhan',
      filled: lCount > 0,
      filledCount: lCount,
      totalCount: LAYANAN_LAINNYA_KEYS.length,
    },
  };

  const ordered = [steps.kelainan, steps.pengobatan, steps.lainnya];
  return {
    steps,
    ordered,
    emptySteps: ordered.filter((s) => !s.filled),
  };
}

const KUNJUNGAN_DALAM_KEYS: ReadonlyArray<keyof KunjunganInput> = [
  'dg45_59L', 'dg45_59P', 'dg60_69L', 'dg60_69P', 'dg70L', 'dg70P',
];
const KUNJUNGAN_LUAR_KEYS: ReadonlyArray<keyof KunjunganInput> = [
  'lg45_59L', 'lg45_59P', 'lg60_69L', 'lg60_69P', 'lg70L', 'lg70P',
];
const KUNJUNGAN_KEM_KEYS: ReadonlyArray<keyof KunjunganInput> = [
  'kem60_69A', 'kem60_69B', 'kem60_69C', 'kem70A', 'kem70B', 'kem70C',
];
const KUNJUNGAN_POS_KEYS: ReadonlyArray<keyof KunjunganInput> = [
  'jmlPosyandu', 'pemberdayaanLansia', 'posyanduPtm', 'jmlKader', 'kaderTerlatih', 'jmlJkn',
];

export function getKunjunganStepStatus(row: KunjunganInput): {
  steps: Record<KunjunganPageId, StepStatusItem<KunjunganPageId>>;
  ordered: StepStatusItem<KunjunganPageId>[];
  emptySteps: StepStatusItem<KunjunganPageId>[];
} {
  const dCount = countFilledFields(row, KUNJUNGAN_DALAM_KEYS);
  const lCount = countFilledFields(row, KUNJUNGAN_LUAR_KEYS);
  const kCount = countFilledFields(row, KUNJUNGAN_KEM_KEYS);
  const pCount = countFilledFields(row, KUNJUNGAN_POS_KEYS);

  const steps: Record<KunjunganPageId, StepStatusItem<KunjunganPageId>> = {
    dalam: {
      id: 'dalam',
      label: 'Dalam Gedung',
      filled: dCount > 0,
      filledCount: dCount,
      totalCount: KUNJUNGAN_DALAM_KEYS.length,
    },
    luar: {
      id: 'luar',
      label: 'Luar Gedung',
      filled: lCount > 0,
      filledCount: lCount,
      totalCount: KUNJUNGAN_LUAR_KEYS.length,
    },
    kemandirian: {
      id: 'kemandirian',
      label: 'Kemandirian',
      filled: kCount > 0,
      filledCount: kCount,
      totalCount: KUNJUNGAN_KEM_KEYS.length,
    },
    posyandu: {
      id: 'posyandu',
      label: 'Posyandu & JKN',
      filled: pCount > 0,
      filledCount: pCount,
      totalCount: KUNJUNGAN_POS_KEYS.length,
    },
  };

  const ordered = [steps.dalam, steps.luar, steps.kemandirian, steps.posyandu];
  return {
    steps,
    ordered,
    emptySteps: ordered.filter((s) => !s.filled),
  };
}
