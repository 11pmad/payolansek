import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  KELURAHAN_LIST,
  MONTH_NAMES,
  MONTH_TITLES,
  type KunjunganComputed,
  type KunjunganInput,
  type LayananComputed,
  type LayananInput,
  type NullableNum,
  type YearReportData,
} from '../shared/types.js';
import {
  computeMonthLayanan,
  computeYearKunjungan,
  createEmptyKunjunganInput,
  createEmptyLayananInput,
} from '../shared/calculations.js';

export const KUNJUNGAN_SHEET_NAME = 'Lap. Kunjungan  ';
export const LAYANAN_SHEET_NAME = 'Lap. Layanan Lansia ';
export const DEFAULT_TEMPLATE_PATH = path.resolve(process.cwd(), 'templates', 'template_laporan_lansia.xlsx');

function findSheet(workbook: ExcelJS.Workbook, targetName: string): ExcelJS.Worksheet | undefined {
  const exact = workbook.getWorksheet(targetName);
  if (exact) return exact;
  const trimmedTarget = targetName.trim().toLowerCase();
  return workbook.worksheets.find((ws) => ws.name.trim().toLowerCase() === trimmedTarget);
}

function readNumericCell(cell: ExcelJS.Cell): NullableNum {
  const raw = cell.value;
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'string') {
    const cleaned = raw.trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof raw === 'object' && 'result' in raw) {
    const res = (raw as { result?: unknown }).result;
    if (typeof res === 'number' && Number.isFinite(res)) return res;
    if (typeof res === 'string' && res.trim() !== '') {
      const num = Number(res);
      return Number.isFinite(num) ? num : null;
    }
  }
  return null;
}

function readTextCell(cell: ExcelJS.Cell): string {
  const raw = cell.value;
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  if (typeof raw === 'object' && 'richText' in raw && Array.isArray((raw as { richText: unknown[] }).richText)) {
    return (raw as { richText: Array<{ text?: string }> }).richText.map((t) => t.text ?? '').join('').trim();
  }
  if (typeof raw === 'object' && 'result' in raw) {
    const res = (raw as { result?: unknown }).result;
    return res === null || res === undefined ? '' : String(res).trim();
  }
  return '';
}

function cleanColonHeader(text: string, fallback: string): string {
  const idx = text.indexOf(':');
  const extracted = idx >= 0 ? text.slice(idx + 1).trim() : text.trim();
  return extracted || fallback;
}

export async function parseExcelWorkbook(
  source: string | Buffer,
  year: number = 2026,
): Promise<YearReportData> {
  const workbook = new ExcelJS.Workbook();
  if (typeof source === 'string') {
    await workbook.xlsx.readFile(source);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(source as any);
  }

  const wsKunj = findSheet(workbook, KUNJUNGAN_SHEET_NAME);
  const wsLay = findSheet(workbook, LAYANAN_SHEET_NAME);

  if (!wsKunj && !wsLay) {
    throw new Error(
      'File Excel tidak memiliki sheet "Lap. Kunjungan" maupun "Lap. Layanan Lansia".',
    );
  }

  let puskesmas = 'PAYOLANSEK';
  let kota = 'PAYAKUMBUH';
  if (wsKunj) {
    puskesmas = cleanColonHeader(readTextCell(wsKunj.getCell('C3')), puskesmas);
    kota = cleanColonHeader(readTextCell(wsKunj.getCell('C4')), kota);
  } else if (wsLay) {
    puskesmas = cleanColonHeader(readTextCell(wsLay.getCell('A3')), puskesmas);
    kota = cleanColonHeader(readTextCell(wsLay.getCell('B4')), kota);
  }

  const kunjungan: Record<number, KunjunganInput[]> = {};
  const layanan: Record<number, LayananInput[]> = {};

  for (let m = 0; m < 12; m++) {
    const monthNum = m + 1;
    const base = 1 + m * 22;
    kunjungan[monthNum] = [];
    layanan[monthNum] = [];

    for (let k = 0; k < KELURAHAN_LIST.length; k++) {
      const r = base + 11 + k;

      if (wsKunj) {
        const getN = (col: string) => readNumericCell(wsKunj.getCell(`${col}${r}`));
        kunjungan[monthNum].push({
          jmlPosyandu: getN('C'),
          pemberdayaanLansia: getN('D'),
          posyanduPtm: getN('E'),
          jmlKader: getN('F'),
          kaderTerlatih: getN('G'),
          sas45_59L: getN('H'),
          sas45_59P: getN('I'),
          sas60_69L: getN('J'),
          sas60_69P: getN('K'),
          sas70L: getN('L'),
          sas70P: getN('M'),
          jmlJkn: getN('O'),
          dg45_59L: getN('Q'),
          dg45_59P: getN('S'),
          dg60_69L: getN('U'),
          dg60_69P: getN('W'),
          dg70L: getN('Y'),
          dg70P: getN('AA'),
          lg45_59L: getN('AC'),
          lg45_59P: getN('AE'),
          lg60_69L: getN('AG'),
          lg60_69P: getN('AI'),
          lg70L: getN('AK'),
          lg70P: getN('AM'),
          kem60_69A: getN('BP'),
          kem60_69B: getN('BQ'),
          kem60_69C: getN('BR'),
          kem70A: getN('BS'),
          kem70B: getN('BT'),
          kem70C: getN('BU'),
        });
      } else {
        kunjungan[monthNum].push(createEmptyKunjunganInput());
      }

      if (wsLay) {
        const getN = (col: string) => readNumericCell(wsLay.getCell(`${col}${r}`));
        const ketRaw = readTextCell(wsLay.getCell(`AY${r}`));
        layanan[monthNum].push({
          sas45_59L: getN('C'),
          sas45_59P: getN('D'),
          sas60_69L: getN('E'),
          sas60_69P: getN('F'),
          sas70L: getN('G'),
          sas70P: getN('H'),
          ggnMeL: getN('J'),
          ggnMeP: getN('K'),
          imtLebihL: getN('L'),
          imtLebihP: getN('M'),
          imtKurangL: getN('N'),
          imtKurangP: getN('O'),
          tdTinggiL: getN('P'),
          tdTinggiP: getN('Q'),
          tdRendahL: getN('R'),
          tdRendahP: getN('S'),
          hbKurangL: getN('T'),
          hbKurangP: getN('U'),
          kolesterolL: getN('V'),
          kolesterolP: getN('W'),
          dmL: getN('X'),
          dmP: getN('Y'),
          asamUratL: getN('Z'),
          asamUratP: getN('AA'),
          ggnGinjalL: getN('AB'),
          ggnGinjalP: getN('AC'),
          ggnKognitifL: getN('AD'),
          ggnKognitifP: getN('AE'),
          ggnPenglihatanL: getN('AF'),
          ggnPenglihatanP: getN('AG'),
          ggnPendengaranL: getN('AH'),
          ggnPendengaranP: getN('AI'),
          lainLainL: getN('AJ'),
          lainLainP: getN('AK'),
          diedukasi: getN('AO'),
          diobati: getN('AP'),
          dirujuk: getN('AQ'),
          konselingBaru: getN('AR'),
          konselingLama: getN('AS'),
          konselingSelesai: getN('AT'),
          penyuluhan: getN('AU'),
          aktifBekerja: getN('AV'),
          pantiWredha: getN('AW'),
          homecare: getN('AX'),
          keterangan: ketRaw === '0' ? '' : ketRaw,
        });
      } else {
        layanan[monthNum].push(createEmptyLayananInput());
      }
    }
  }

  return {
    year,
    puskesmas,
    kota,
    updatedAt: new Date().toISOString(),
    kunjungan,
    layanan,
  };
}

function setFormula(cell: ExcelJS.Cell, formula: string, result: number): void {
  cell.value = { formula, result };
}

function setInputVal(cell: ExcelJS.Cell, val: NullableNum): void {
  cell.value = val === null || val === undefined ? null : val;
}

const KUNJUNGAN_SUM_COLS: ReadonlyArray<{ col: string; getVal: (r: KunjunganComputed) => number }> = [
  { col: 'C', getVal: (r) => r.jmlPosyandu ?? 0 },
  { col: 'D', getVal: (r) => r.pemberdayaanLansia ?? 0 },
  { col: 'E', getVal: (r) => r.posyanduPtm ?? 0 },
  { col: 'F', getVal: (r) => r.jmlKader ?? 0 },
  { col: 'G', getVal: (r) => r.kaderTerlatih ?? 0 },
  { col: 'H', getVal: (r) => r.sas45_59L ?? 0 },
  { col: 'I', getVal: (r) => r.sas45_59P ?? 0 },
  { col: 'J', getVal: (r) => r.sas60_69L ?? 0 },
  { col: 'K', getVal: (r) => r.sas60_69P ?? 0 },
  { col: 'L', getVal: (r) => r.sas70L ?? 0 },
  { col: 'M', getVal: (r) => r.sas70P ?? 0 },
  { col: 'O', getVal: (r) => r.jmlJkn ?? 0 },
  { col: 'P', getVal: (r) => r.dg45_59L_Lama },
  { col: 'Q', getVal: (r) => r.dg45_59L ?? 0 },
  { col: 'R', getVal: (r) => r.dg45_59P_Lama },
  { col: 'S', getVal: (r) => r.dg45_59P ?? 0 },
  { col: 'T', getVal: (r) => r.dg60_69L_Lama },
  { col: 'U', getVal: (r) => r.dg60_69L ?? 0 },
  { col: 'V', getVal: (r) => r.dg60_69P_Lama },
  { col: 'W', getVal: (r) => r.dg60_69P ?? 0 },
  { col: 'X', getVal: (r) => r.dg70L_Lama },
  { col: 'Y', getVal: (r) => r.dg70L ?? 0 },
  { col: 'Z', getVal: (r) => r.dg70P_Lama },
  { col: 'AA', getVal: (r) => r.dg70P ?? 0 },
  { col: 'AB', getVal: (r) => r.lg45_59L_Lama },
  { col: 'AC', getVal: (r) => r.lg45_59L ?? 0 },
  { col: 'AD', getVal: (r) => r.lg45_59P_Lama },
  { col: 'AE', getVal: (r) => r.lg45_59P ?? 0 },
  { col: 'AF', getVal: (r) => r.lg60_69L_Lama },
  { col: 'AG', getVal: (r) => r.lg60_69L ?? 0 },
  { col: 'AH', getVal: (r) => r.lg60_69P_Lama },
  { col: 'AI', getVal: (r) => r.lg60_69P ?? 0 },
  { col: 'AJ', getVal: (r) => r.lg70L_Lama },
  { col: 'AK', getVal: (r) => r.lg70L ?? 0 },
  { col: 'AL', getVal: (r) => r.lg70P_Lama },
  { col: 'AM', getVal: (r) => r.lg70P ?? 0 },
  { col: 'AN', getVal: (r) => r.tot45_59L_Lama },
  { col: 'AO', getVal: (r) => r.tot45_59L_Baru },
  { col: 'AP', getVal: (r) => r.tot45_59P_Lama },
  { col: 'AQ', getVal: (r) => r.tot45_59P_Baru },
  { col: 'AR', getVal: (r) => r.tot60_69L_Lama },
  { col: 'AS', getVal: (r) => r.tot60_69L_Baru },
  { col: 'AT', getVal: (r) => r.tot60_69P_Lama },
  { col: 'AU', getVal: (r) => r.tot60_69P_Baru },
  { col: 'AV', getVal: (r) => r.tot70L_Lama },
  { col: 'AW', getVal: (r) => r.tot70L_Baru },
  { col: 'AX', getVal: (r) => r.tot70P_Lama },
  { col: 'AY', getVal: (r) => r.tot70P_Baru },
  { col: 'AZ', getVal: (r) => r.std45_59L_Baru },
  { col: 'BA', getVal: (r) => r.std45_59L_Abs },
  { col: 'BB', getVal: (r) => r.std45_59P_Baru },
  { col: 'BC', getVal: (r) => r.std45_59P_Abs },
  { col: 'BD', getVal: (r) => r.std60_69L_Baru },
  { col: 'BE', getVal: (r) => r.std60_69L_Abs },
  { col: 'BF', getVal: (r) => r.std60_69P_Baru },
  { col: 'BG', getVal: (r) => r.std60_69P_Abs },
  { col: 'BH', getVal: (r) => r.std70L_Baru },
  { col: 'BI', getVal: (r) => r.std70L_Abs },
  { col: 'BJ', getVal: (r) => r.std70P_Baru },
  { col: 'BK', getVal: (r) => r.std70P_Abs },
  { col: 'BL', getVal: (r) => r.komdatL },
  { col: 'BM', getVal: (r) => r.komdatP },
  { col: 'BN', getVal: (r) => r.komdatTotal },
  { col: 'BP', getVal: (r) => r.kem60_69A ?? 0 },
  { col: 'BQ', getVal: (r) => r.kem60_69B ?? 0 },
  { col: 'BR', getVal: (r) => r.kem60_69C ?? 0 },
  { col: 'BS', getVal: (r) => r.kem70A ?? 0 },
  { col: 'BT', getVal: (r) => r.kem70B ?? 0 },
  { col: 'BU', getVal: (r) => r.kem70C ?? 0 },
];

const LAYANAN_SUM_COLS: ReadonlyArray<{ col: string; getVal: (r: LayananComputed) => number }> = [
  { col: 'C', getVal: (r) => r.sas45_59L ?? 0 },
  { col: 'D', getVal: (r) => r.sas45_59P ?? 0 },
  { col: 'E', getVal: (r) => r.sas60_69L ?? 0 },
  { col: 'F', getVal: (r) => r.sas60_69P ?? 0 },
  { col: 'G', getVal: (r) => r.sas70L ?? 0 },
  { col: 'H', getVal: (r) => r.sas70P ?? 0 },
  { col: 'I', getVal: (r) => r.sasTotal60 },
  { col: 'J', getVal: (r) => r.ggnMeL ?? 0 },
  { col: 'K', getVal: (r) => r.ggnMeP ?? 0 },
  { col: 'L', getVal: (r) => r.imtLebihL ?? 0 },
  { col: 'M', getVal: (r) => r.imtLebihP ?? 0 },
  { col: 'N', getVal: (r) => r.imtKurangL ?? 0 },
  { col: 'O', getVal: (r) => r.imtKurangP ?? 0 },
  { col: 'P', getVal: (r) => r.tdTinggiL ?? 0 },
  { col: 'Q', getVal: (r) => r.tdTinggiP ?? 0 },
  { col: 'R', getVal: (r) => r.tdRendahL ?? 0 },
  { col: 'S', getVal: (r) => r.tdRendahP ?? 0 },
  { col: 'T', getVal: (r) => r.hbKurangL ?? 0 },
  { col: 'U', getVal: (r) => r.hbKurangP ?? 0 },
  { col: 'V', getVal: (r) => r.kolesterolL ?? 0 },
  { col: 'W', getVal: (r) => r.kolesterolP ?? 0 },
  { col: 'X', getVal: (r) => r.dmL ?? 0 },
  { col: 'Y', getVal: (r) => r.dmP ?? 0 },
  { col: 'Z', getVal: (r) => r.asamUratL ?? 0 },
  { col: 'AA', getVal: (r) => r.asamUratP ?? 0 },
  { col: 'AB', getVal: (r) => r.ggnGinjalL ?? 0 },
  { col: 'AC', getVal: (r) => r.ggnGinjalP ?? 0 },
  { col: 'AD', getVal: (r) => r.ggnKognitifL ?? 0 },
  { col: 'AE', getVal: (r) => r.ggnKognitifP ?? 0 },
  { col: 'AF', getVal: (r) => r.ggnPenglihatanL ?? 0 },
  { col: 'AG', getVal: (r) => r.ggnPenglihatanP ?? 0 },
  { col: 'AH', getVal: (r) => r.ggnPendengaranL ?? 0 },
  { col: 'AI', getVal: (r) => r.ggnPendengaranP ?? 0 },
  { col: 'AJ', getVal: (r) => r.lainLainL ?? 0 },
  { col: 'AK', getVal: (r) => r.lainLainP ?? 0 },
  { col: 'AL', getVal: (r) => r.kelainanL },
  { col: 'AM', getVal: (r) => r.kelainanP },
  { col: 'AN', getVal: (r) => r.kelainanTotal },
  { col: 'AO', getVal: (r) => r.diedukasi ?? 0 },
  { col: 'AP', getVal: (r) => r.diobati ?? 0 },
  { col: 'AQ', getVal: (r) => r.dirujuk ?? 0 },
  { col: 'AR', getVal: (r) => r.konselingBaru ?? 0 },
  { col: 'AS', getVal: (r) => r.konselingLama ?? 0 },
  { col: 'AT', getVal: (r) => r.konselingSelesai ?? 0 },
  { col: 'AU', getVal: (r) => r.penyuluhan ?? 0 },
  { col: 'AV', getVal: (r) => r.aktifBekerja ?? 0 },
  { col: 'AW', getVal: (r) => r.pantiWredha ?? 0 },
  { col: 'AX', getVal: (r) => r.homecare ?? 0 },
];

export async function buildOfficialExcelWorkbook(
  report: YearReportData,
  templatePath: string = DEFAULT_TEMPLATE_PATH,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  // Remove scratch sheet Sheet1 from official export
  const scratch = workbook.getWorksheet('Sheet1');
  if (scratch) {
    workbook.removeWorksheet(scratch.id);
  }

  const wsKunj = findSheet(workbook, KUNJUNGAN_SHEET_NAME);
  const wsLay = findSheet(workbook, LAYANAN_SHEET_NAME);
  if (!wsKunj || !wsLay) {
    throw new Error('Template Excel tidak valid: sheet resmi tidak ditemukan.');
  }

  const computedKunj = computeYearKunjungan(report.kunjungan);

  for (let m = 0; m < 12; m++) {
    const monthNum = m + 1;
    const base = 1 + m * 22;
    const monthK = computedKunj[monthNum];

    // Update header metadata & fix Aug 'kubugadang' typo
    wsKunj.getCell(`C${base + 2}`).value = `: ${report.puskesmas}`;
    wsKunj.getCell(`C${base + 3}`).value = `: ${report.kota}`;
    wsKunj.getCell(`C${base + 4}`).value = `: ${MONTH_NAMES[m]}`;
    wsKunj.getCell(`BN${base + 20}`).value = `Payakumbuh, ${MONTH_TITLES[m]} ${report.year}`;

    const firstKelRow = base + 11;
    const lastKelRow = base + 16;

    for (let k = 0; k < KELURAHAN_LIST.length; k++) {
      const r = firstKelRow + k;
      const rowData = monthK.rows[k];

      // Fix No (1..6) & Kelurahan label (fixes Aug 'januari/februrari/maret' & Talang '5'->'6')
      wsKunj.getCell(`A${r}`).value = k + 1;
      wsKunj.getCell(`B${r}`).value = KELURAHAN_LIST[k].kunjunganLabel;

      setInputVal(wsKunj.getCell(`C${r}`), rowData.jmlPosyandu);
      setInputVal(wsKunj.getCell(`D${r}`), rowData.pemberdayaanLansia);
      setInputVal(wsKunj.getCell(`E${r}`), rowData.posyanduPtm);
      setInputVal(wsKunj.getCell(`F${r}`), rowData.jmlKader);
      setInputVal(wsKunj.getCell(`G${r}`), rowData.kaderTerlatih);

      setInputVal(wsKunj.getCell(`H${r}`), rowData.sas45_59L);
      setInputVal(wsKunj.getCell(`I${r}`), rowData.sas45_59P);
      setInputVal(wsKunj.getCell(`J${r}`), rowData.sas60_69L);
      setInputVal(wsKunj.getCell(`K${r}`), rowData.sas60_69P);
      setInputVal(wsKunj.getCell(`L${r}`), rowData.sas70L);
      setInputVal(wsKunj.getCell(`M${r}`), rowData.sas70P);
      setFormula(wsKunj.getCell(`N${r}`), `SUM(J${r}:M${r})`, rowData.sasTotal60);
      setInputVal(wsKunj.getCell(`O${r}`), rowData.jmlJkn);

      const lamaPairs: Array<[string, string, number]> = [
        ['P', 'Q', rowData.dg45_59L_Lama],
        ['R', 'S', rowData.dg45_59P_Lama],
        ['T', 'U', rowData.dg60_69L_Lama],
        ['V', 'W', rowData.dg60_69P_Lama],
        ['X', 'Y', rowData.dg70L_Lama],
        ['Z', 'AA', rowData.dg70P_Lama],
        ['AB', 'AC', rowData.lg45_59L_Lama],
        ['AD', 'AE', rowData.lg45_59P_Lama],
        ['AF', 'AG', rowData.lg60_69L_Lama],
        ['AH', 'AI', rowData.lg60_69P_Lama],
        ['AJ', 'AK', rowData.lg70L_Lama],
        ['AL', 'AM', rowData.lg70P_Lama],
      ];

      for (const [lamaCol, baruCol, lamaVal] of lamaPairs) {
        if (m === 0) {
          wsKunj.getCell(`${lamaCol}${r}`).value = null;
        } else {
          const prevR = r - 22;
          setFormula(wsKunj.getCell(`${lamaCol}${r}`), `${lamaCol}${prevR}+${baruCol}${prevR}`, lamaVal);
        }
      }

      setInputVal(wsKunj.getCell(`Q${r}`), rowData.dg45_59L);
      setInputVal(wsKunj.getCell(`S${r}`), rowData.dg45_59P);
      setInputVal(wsKunj.getCell(`U${r}`), rowData.dg60_69L);
      setInputVal(wsKunj.getCell(`W${r}`), rowData.dg60_69P);
      setInputVal(wsKunj.getCell(`Y${r}`), rowData.dg70L);
      setInputVal(wsKunj.getCell(`AA${r}`), rowData.dg70P);

      setInputVal(wsKunj.getCell(`AC${r}`), rowData.lg45_59L);
      setInputVal(wsKunj.getCell(`AE${r}`), rowData.lg45_59P);
      setInputVal(wsKunj.getCell(`AG${r}`), rowData.lg60_69L);
      setInputVal(wsKunj.getCell(`AI${r}`), rowData.lg60_69P);
      setInputVal(wsKunj.getCell(`AK${r}`), rowData.lg70L);
      setInputVal(wsKunj.getCell(`AM${r}`), rowData.lg70P);

      setFormula(wsKunj.getCell(`AN${r}`), `P${r}+AB${r}`, rowData.tot45_59L_Lama);
      setFormula(wsKunj.getCell(`AO${r}`), `Q${r}+AC${r}`, rowData.tot45_59L_Baru);
      setFormula(wsKunj.getCell(`AP${r}`), `R${r}+AD${r}`, rowData.tot45_59P_Lama);
      setFormula(wsKunj.getCell(`AQ${r}`), `S${r}+AE${r}`, rowData.tot45_59P_Baru);
      setFormula(wsKunj.getCell(`AR${r}`), `T${r}+AF${r}`, rowData.tot60_69L_Lama);
      setFormula(wsKunj.getCell(`AS${r}`), `U${r}+AG${r}`, rowData.tot60_69L_Baru);
      setFormula(wsKunj.getCell(`AT${r}`), `V${r}+AH${r}`, rowData.tot60_69P_Lama);
      setFormula(wsKunj.getCell(`AU${r}`), `W${r}+AI${r}`, rowData.tot60_69P_Baru);
      setFormula(wsKunj.getCell(`AV${r}`), `X${r}+AJ${r}`, rowData.tot70L_Lama);
      setFormula(wsKunj.getCell(`AW${r}`), `Y${r}+AK${r}`, rowData.tot70L_Baru);
      setFormula(wsKunj.getCell(`AX${r}`), `Z${r}+AL${r}`, rowData.tot70P_Lama);
      setFormula(wsKunj.getCell(`AY${r}`), `AA${r}+AM${r}`, rowData.tot70P_Baru);

      setFormula(wsKunj.getCell(`AZ${r}`), `AO${r}`, rowData.std45_59L_Baru);
      setFormula(wsKunj.getCell(`BA${r}`), `SUM(AN${r}:AO${r})`, rowData.std45_59L_Abs);
      setFormula(wsKunj.getCell(`BB${r}`), `S${r}+AE${r}`, rowData.std45_59P_Baru);
      setFormula(wsKunj.getCell(`BC${r}`), `SUM(AP${r}:AQ${r})`, rowData.std45_59P_Abs);
      setFormula(wsKunj.getCell(`BD${r}`), `U${r}+AG${r}`, rowData.std60_69L_Baru);
      setFormula(wsKunj.getCell(`BE${r}`), `SUM(AR${r}:AS${r})`, rowData.std60_69L_Abs);
      setFormula(wsKunj.getCell(`BF${r}`), `W${r}+AI${r}`, rowData.std60_69P_Baru);
      setFormula(wsKunj.getCell(`BG${r}`), `SUM(AT${r}:AU${r})`, rowData.std60_69P_Abs);
      setFormula(wsKunj.getCell(`BH${r}`), `Y${r}+AK${r}`, rowData.std70L_Baru);
      setFormula(wsKunj.getCell(`BI${r}`), `SUM(AV${r}:AW${r})`, rowData.std70L_Abs);
      setFormula(wsKunj.getCell(`BJ${r}`), `AA${r}+AM${r}`, rowData.std70P_Baru);
      setFormula(wsKunj.getCell(`BK${r}`), `SUM(AX${r}:AY${r})`, rowData.std70P_Abs);

      setFormula(wsKunj.getCell(`BL${r}`), `BE${r}+BI${r}`, rowData.komdatL);
      setFormula(wsKunj.getCell(`BM${r}`), `BG${r}+BK${r}`, rowData.komdatP);
      setFormula(wsKunj.getCell(`BN${r}`), `BL${r}+BM${r}`, rowData.komdatTotal);
      setFormula(wsKunj.getCell(`BO${r}`), `IF(N${r}>0,BN${r}/N${r}*100,0)`, rowData.komdatPct);

      setInputVal(wsKunj.getCell(`BP${r}`), rowData.kem60_69A);
      setInputVal(wsKunj.getCell(`BQ${r}`), rowData.kem60_69B);
      setInputVal(wsKunj.getCell(`BR${r}`), rowData.kem60_69C);
      setInputVal(wsKunj.getCell(`BS${r}`), rowData.kem70A);
      setInputVal(wsKunj.getCell(`BT${r}`), rowData.kem70B);
      setInputVal(wsKunj.getCell(`BU${r}`), rowData.kem70C);
    }

    // JUMLAH row
    const jr = base + 17;
    for (const item of KUNJUNGAN_SUM_COLS) {
      setFormula(
        wsKunj.getCell(`${item.col}${jr}`),
        `SUM(${item.col}${firstKelRow}:${item.col}${lastKelRow})`,
        item.getVal(monthK.totals),
      );
    }
    setFormula(wsKunj.getCell(`N${jr}`), `SUM(J${jr}:M${jr})`, monthK.totals.sasTotal60);
    setFormula(wsKunj.getCell(`BO${jr}`), `IF(N${jr}>0,BN${jr}/N${jr}*100,0)`, monthK.totals.komdatPct);
  }

  // Sheet 2: Lap. Layanan Lansia
  for (let m = 0; m < 12; m++) {
    const monthNum = m + 1;
    const base = 1 + m * 22;
    const monthL = computeMonthLayanan(monthNum, report.layanan[monthNum] ?? []);

    wsLay.getCell(`A${base + 2}`).value = `PUSKESMAS        : ${report.puskesmas}`;
    wsLay.getCell(`B${base + 3}`).value = `                    : ${report.kota}`;
    wsLay.getCell(`A${base + 4}`).value = `BULAN                : ${MONTH_NAMES[m]}`;
    wsLay.getCell(`AT${base + 20}`).value = `Payakumbuh, ${MONTH_TITLES[m]} ${report.year}`;

    const firstKelRow = base + 11;
    const lastKelRow = base + 16;

    for (let k = 0; k < KELURAHAN_LIST.length; k++) {
      const r = firstKelRow + k;
      const rowData = monthL.rows[k];

      wsLay.getCell(`A${r}`).value = k + 1;
      wsLay.getCell(`B${r}`).value = KELURAHAN_LIST[k].layananLabel;

      setInputVal(wsLay.getCell(`C${r}`), rowData.sas45_59L);
      setInputVal(wsLay.getCell(`D${r}`), rowData.sas45_59P);
      setInputVal(wsLay.getCell(`E${r}`), rowData.sas60_69L);
      setInputVal(wsLay.getCell(`F${r}`), rowData.sas60_69P);
      setInputVal(wsLay.getCell(`G${r}`), rowData.sas70L);
      setInputVal(wsLay.getCell(`H${r}`), rowData.sas70P);
      setFormula(wsLay.getCell(`I${r}`), `SUM(E${r}:H${r})`, rowData.sasTotal60);

      setInputVal(wsLay.getCell(`J${r}`), rowData.ggnMeL);
      setInputVal(wsLay.getCell(`K${r}`), rowData.ggnMeP);
      setInputVal(wsLay.getCell(`L${r}`), rowData.imtLebihL);
      setInputVal(wsLay.getCell(`M${r}`), rowData.imtLebihP);
      setInputVal(wsLay.getCell(`N${r}`), rowData.imtKurangL);
      setInputVal(wsLay.getCell(`O${r}`), rowData.imtKurangP);
      setInputVal(wsLay.getCell(`P${r}`), rowData.tdTinggiL);
      setInputVal(wsLay.getCell(`Q${r}`), rowData.tdTinggiP);
      setInputVal(wsLay.getCell(`R${r}`), rowData.tdRendahL);
      setInputVal(wsLay.getCell(`S${r}`), rowData.tdRendahP);
      setInputVal(wsLay.getCell(`T${r}`), rowData.hbKurangL);
      setInputVal(wsLay.getCell(`U${r}`), rowData.hbKurangP);
      setInputVal(wsLay.getCell(`V${r}`), rowData.kolesterolL);
      setInputVal(wsLay.getCell(`W${r}`), rowData.kolesterolP);
      setInputVal(wsLay.getCell(`X${r}`), rowData.dmL);
      setInputVal(wsLay.getCell(`Y${r}`), rowData.dmP);
      setInputVal(wsLay.getCell(`Z${r}`), rowData.asamUratL);
      setInputVal(wsLay.getCell(`AA${r}`), rowData.asamUratP);
      setInputVal(wsLay.getCell(`AB${r}`), rowData.ggnGinjalL);
      setInputVal(wsLay.getCell(`AC${r}`), rowData.ggnGinjalP);
      setInputVal(wsLay.getCell(`AD${r}`), rowData.ggnKognitifL);
      setInputVal(wsLay.getCell(`AE${r}`), rowData.ggnKognitifP);
      setInputVal(wsLay.getCell(`AF${r}`), rowData.ggnPenglihatanL);
      setInputVal(wsLay.getCell(`AG${r}`), rowData.ggnPenglihatanP);
      setInputVal(wsLay.getCell(`AH${r}`), rowData.ggnPendengaranL);
      setInputVal(wsLay.getCell(`AI${r}`), rowData.ggnPendengaranP);
      setInputVal(wsLay.getCell(`AJ${r}`), rowData.lainLainL);
      setInputVal(wsLay.getCell(`AK${r}`), rowData.lainLainP);

      setFormula(
        wsLay.getCell(`AL${r}`),
        `J${r}+L${r}+N${r}+P${r}+R${r}+T${r}+V${r}+X${r}+Z${r}+AB${r}+AD${r}+AF${r}+AH${r}+AJ${r}`,
        rowData.kelainanL,
      );
      // Fixed formula: sum P columns (K, M, O, Q, S, U, W, Y, AA, AC, AE, AG, AI, AK)
      setFormula(
        wsLay.getCell(`AM${r}`),
        `K${r}+M${r}+O${r}+Q${r}+S${r}+U${r}+W${r}+Y${r}+AA${r}+AC${r}+AE${r}+AG${r}+AI${r}+AK${r}`,
        rowData.kelainanP,
      );
      setFormula(wsLay.getCell(`AN${r}`), `AL${r}+AM${r}`, rowData.kelainanTotal);

      setInputVal(wsLay.getCell(`AO${r}`), rowData.diedukasi);
      setInputVal(wsLay.getCell(`AP${r}`), rowData.diobati);
      setInputVal(wsLay.getCell(`AQ${r}`), rowData.dirujuk);
      setInputVal(wsLay.getCell(`AR${r}`), rowData.konselingBaru);
      setInputVal(wsLay.getCell(`AS${r}`), rowData.konselingLama);
      setInputVal(wsLay.getCell(`AT${r}`), rowData.konselingSelesai);
      setInputVal(wsLay.getCell(`AU${r}`), rowData.penyuluhan);
      setInputVal(wsLay.getCell(`AV${r}`), rowData.aktifBekerja);
      setInputVal(wsLay.getCell(`AW${r}`), rowData.pantiWredha);
      setInputVal(wsLay.getCell(`AX${r}`), rowData.homecare);
      wsLay.getCell(`AY${r}`).value = rowData.keterangan ? rowData.keterangan : null;
    }

    const jr = base + 17;
    for (const item of LAYANAN_SUM_COLS) {
      setFormula(
        wsLay.getCell(`${item.col}${jr}`),
        `SUM(${item.col}${firstKelRow}:${item.col}${lastKelRow})`,
        item.getVal(monthL.totals),
      );
    }
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}
