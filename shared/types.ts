export const MONTH_NAMES = [
  'JANUARI',
  'FEBRUARI',
  'MARET',
  'APRIL',
  'MEI',
  'JUNI',
  'JULI',
  'AGUSTUS',
  'SEPTEMBER',
  'OKTOBER',
  'NOVEMBER',
  'DESEMBER',
] as const;

export const MONTH_TITLES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export interface KelurahanMeta {
  idx: number;
  id: string;
  name: string;
  kunjunganLabel: string;
  layananLabel: string;
}

export const KELURAHAN_LIST: readonly KelurahanMeta[] = [
  { idx: 0, id: 'payolansek', name: 'Payolansek', kunjunganLabel: 'PAYOLANSEK', layananLabel: 'PAYOLANSEK' },
  { idx: 1, id: 'bulba', name: 'Bulba', kunjunganLabel: 'BULBA', layananLabel: 'BULBA' },
  { idx: 2, id: 'pakan-sinayan', name: 'Pakan Sinayan', kunjunganLabel: 'P SINAYAN', layananLabel: 'PAKAN SINAYAN' },
  { idx: 3, id: 'kubu-gadang', name: 'Kubu Gadang', kunjunganLabel: 'K GADANG', layananLabel: 'KUBU GADANG' },
  { idx: 4, id: 'koto-tangah', name: 'Koto Tangah', kunjunganLabel: 'K TANGAH', layananLabel: 'KOTO TANGAH' },
  { idx: 5, id: 'talang', name: 'Talang', kunjunganLabel: 'TALANG', layananLabel: 'TALANG' },
] as const;

export type NullableNum = number | null;

export interface KunjunganInput {
  // Posyandu & Kader (C..G)
  jmlPosyandu: NullableNum;
  pemberdayaanLansia: NullableNum;
  posyanduPtm: NullableNum;
  jmlKader: NullableNum;
  kaderTerlatih: NullableNum;

  // Sasaran Lansia & JKN (H..M, O)
  sas45_59L: NullableNum;
  sas45_59P: NullableNum;
  sas60_69L: NullableNum;
  sas60_69P: NullableNum;
  sas70L: NullableNum;
  sas70P: NullableNum;
  jmlJkn: NullableNum;

  // Kunjungan Dalam Gedung (Puskesmas) - Lansia Baru (Q, S, U, W, Y, AA)
  dg45_59L: NullableNum;
  dg45_59P: NullableNum;
  dg60_69L: NullableNum;
  dg60_69P: NullableNum;
  dg70L: NullableNum;
  dg70P: NullableNum;

  // Kunjungan Luar Gedung (Posyandu/Poskeskel) - Lansia Baru (AC, AE, AG, AI, AK, AM)
  lg45_59L: NullableNum;
  lg45_59P: NullableNum;
  lg60_69L: NullableNum;
  lg60_69P: NullableNum;
  lg70L: NullableNum;
  lg70P: NullableNum;

  // Kemandirian (BP..BU)
  kem60_69A: NullableNum;
  kem60_69B: NullableNum;
  kem60_69C: NullableNum;
  kem70A: NullableNum;
  kem70B: NullableNum;
  kem70C: NullableNum;
}

export interface KunjunganComputed extends KunjunganInput {
  kelurahanIdx: number;
  sasTotal60: number; // N = J+K+L+M

  // Auto-calculated Lansia Lama (0 in Jan, prev.lama + prev.baru in Feb..Des)
  dg45_59L_Lama: number; // P
  dg45_59P_Lama: number; // R
  dg60_69L_Lama: number; // T
  dg60_69P_Lama: number; // V
  dg70L_Lama: number;    // X
  dg70P_Lama: number;    // Z

  lg45_59L_Lama: number; // AB
  lg45_59P_Lama: number; // AD
  lg60_69L_Lama: number; // AF
  lg60_69P_Lama: number; // AH
  lg70L_Lama: number;    // AJ
  lg70P_Lama: number;    // AL

  // Total Kunjungan Lansia (AN..AY)
  tot45_59L_Lama: number; // AN
  tot45_59L_Baru: number; // AO
  tot45_59P_Lama: number; // AP
  tot45_59P_Baru: number; // AQ
  tot60_69L_Lama: number; // AR
  tot60_69L_Baru: number; // AS
  tot60_69P_Lama: number; // AT
  tot60_69P_Baru: number; // AU
  tot70L_Lama: number;    // AV
  tot70L_Baru: number;    // AW
  tot70P_Lama: number;    // AX
  tot70P_Baru: number;    // AY

  // Lansia yang dilayani sesuai standart (AZ..BK)
  std45_59L_Baru: number; // AZ
  std45_59L_Abs: number;  // BA
  std45_59P_Baru: number; // BB
  std45_59P_Abs: number;  // BC
  std60_69L_Baru: number; // BD
  std60_69L_Abs: number;  // BE
  std60_69P_Baru: number; // BF
  std60_69P_Abs: number;  // BG
  std70L_Baru: number;    // BH
  std70L_Abs: number;     // BI
  std70P_Baru: number;    // BJ
  std70P_Abs: number;     // BK

  // Jumlah data Komdat > 60 Th (BL..BO)
  komdatL: number;     // BL = BE + BI
  komdatP: number;     // BM = BG + BK
  komdatTotal: number; // BN = BL + BM
  komdatPct: number;   // BO = sasTotal60 > 0 ? komdatTotal / sasTotal60 * 100 : 0

  // Helper metrics for UI
  dalamGedungBaruBulanIni: number;
  luarGedungBaruBulanIni: number;
  kunjunganBaruBulanIni: number;
  hasInput: boolean;
}

export interface KunjunganMonthComputed {
  month: number; // 1..12
  rows: KunjunganComputed[]; // 6 kelurahan
  totals: KunjunganComputed; // JUMLAH row
  filledCount: number; // 0..6
}

export interface LayananInput {
  // Sasaran Lansia (C..H)
  sas45_59L: NullableNum;
  sas45_59P: NullableNum;
  sas60_69L: NullableNum;
  sas60_69P: NullableNum;
  sas70L: NullableNum;
  sas70P: NullableNum;

  // 14 Kelainan x L/P (J..AK)
  ggnMeL: NullableNum;         // J
  ggnMeP: NullableNum;         // K
  imtLebihL: NullableNum;      // L
  imtLebihP: NullableNum;      // M
  imtKurangL: NullableNum;     // N
  imtKurangP: NullableNum;     // O
  tdTinggiL: NullableNum;      // P
  tdTinggiP: NullableNum;      // Q
  tdRendahL: NullableNum;      // R
  tdRendahP: NullableNum;      // S
  hbKurangL: NullableNum;      // T
  hbKurangP: NullableNum;      // U
  kolesterolL: NullableNum;    // V
  kolesterolP: NullableNum;    // W
  dmL: NullableNum;            // X
  dmP: NullableNum;            // Y
  asamUratL: NullableNum;      // Z
  asamUratP: NullableNum;      // AA
  ggnGinjalL: NullableNum;     // AB
  ggnGinjalP: NullableNum;     // AC
  ggnKognitifL: NullableNum;   // AD
  ggnKognitifP: NullableNum;   // AE
  ggnPenglihatanL: NullableNum;// AF
  ggnPenglihatanP: NullableNum;// AG
  ggnPendengaranL: NullableNum;// AH
  ggnPendengaranP: NullableNum;// AI
  lainLainL: NullableNum;      // AJ
  lainLainP: NullableNum;      // AK

  // Pengobatan (AO..AQ)
  diedukasi: NullableNum;
  diobati: NullableNum;
  dirujuk: NullableNum;

  // Konseling (AR..AT)
  konselingBaru: NullableNum;
  konselingLama: NullableNum;
  konselingSelesai: NullableNum;

  // Lainnya (AU..AY)
  penyuluhan: NullableNum;
  aktifBekerja: NullableNum;
  pantiWredha: NullableNum;
  homecare: NullableNum;
  keterangan: string;
}

export interface LayananComputed extends LayananInput {
  kelurahanIdx: number;
  sasTotal60: number;    // I = E+F+G+H
  kelainanL: number;     // AL = sum of 14 L fields
  kelainanP: number;     // AM = sum of 14 P fields
  kelainanTotal: number; // AN = AL + AM
  hasInput: boolean;
}

export interface LayananMonthComputed {
  month: number; // 1..12
  rows: LayananComputed[]; // 6 kelurahan
  totals: LayananComputed; // JUMLAH row
  filledCount: number; // 0..6
}

export interface YearReportData {
  year: number;
  puskesmas: string;
  kota: string;
  updatedAt: string;
  // keyed by month 1..12 -> array of 6 kelurahan
  kunjungan: Record<number, KunjunganInput[]>;
  layanan: Record<number, LayananInput[]>;
}

export interface YearSummary {
  year: number;
  puskesmas: string;
  kota: string;
  updatedAt: string;
}
