import type {
  KunjunganInput,
  LayananInput,
  YearReportData,
  YearSummary,
} from '../shared/types.js';

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `Terjadi kesalahan (${res.status})`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function fetchYears(): Promise<YearSummary[]> {
  const data = await handleJson<{ years: YearSummary[] }>(await fetch('/api/years'));
  return data.years;
}

export async function createYear(year: number, copyFromYear?: number): Promise<YearReportData> {
  return handleJson<YearReportData>(
    await fetch('/api/years', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, copyFromYear }),
    }),
  );
}

export async function fetchReport(year: number): Promise<YearReportData> {
  return handleJson<YearReportData>(await fetch(`/api/reports/${year}`));
}

export async function saveKunjungan(
  year: number,
  month: number,
  kelurahanIdx: number,
  data: KunjunganInput,
): Promise<{ ok: boolean; updatedAt: string; data: KunjunganInput }> {
  return handleJson(
    await fetch(`/api/reports/${year}/kunjungan/${month}/${kelurahanIdx}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

export async function saveLayanan(
  year: number,
  month: number,
  kelurahanIdx: number,
  data: LayananInput,
): Promise<{ ok: boolean; updatedAt: string; data: LayananInput }> {
  return handleJson(
    await fetch(`/api/reports/${year}/layanan/${month}/${kelurahanIdx}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  );
}

export async function copyPosyanduFromPrevMonth(
  year: number,
  targetMonth: number,
  sourceMonth: number,
  kelurahanIdx?: number,
): Promise<YearReportData> {
  return handleJson<YearReportData>(
    await fetch(`/api/reports/${year}/copy-posyandu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetMonth, sourceMonth, kelurahanIdx }),
    }),
  );
}

export async function saveSettings(
  year: number,
  payload: {
    puskesmas: string;
    kota: string;
    sasaranKunjungan?: Array<
      Pick<KunjunganInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>
    >;
    sasaranLayanan?: Array<
      Pick<LayananInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>
    >;
  },
): Promise<YearReportData> {
  return handleJson<YearReportData>(
    await fetch(`/api/reports/${year}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function importExcelFile(year: number, file: File): Promise<YearReportData> {
  const form = new FormData();
  form.append('file', file);
  return handleJson<YearReportData>(
    await fetch(`/api/reports/${year}/import`, {
      method: 'POST',
      body: form,
    }),
  );
}

export function getExportUrl(year: number): string {
  return `/api/reports/${year}/export`;
}
