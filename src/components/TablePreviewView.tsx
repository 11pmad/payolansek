import { useState } from 'react';
import {
  KELURAHAN_LIST,
  MONTH_TITLES,
  type KunjunganComputed,
  type KunjunganMonthComputed,
  type LayananComputed,
  type LayananMonthComputed,
} from '../../shared/types.js';
import { KELAINAN_DEFINITIONS, n } from '../../shared/calculations.js';

interface TablePreviewViewProps {
  year: number;
  month: number;
  onChangeMonth: (month: number) => void;
  kunjunganYear: Record<number, KunjunganMonthComputed>;
  layananYear: Record<number, LayananMonthComputed>;
}

export function TablePreviewView({
  year,
  month,
  onChangeMonth,
  kunjunganYear,
  layananYear,
}: TablePreviewViewProps) {
  const [sheet, setSheet] = useState<'kunjungan' | 'layanan'>('kunjungan');
  const kMonth = kunjunganYear[month];
  const lMonth = layananYear[month];

  const kAllRows: Array<{ label: string; row: KunjunganComputed; isTotal?: boolean }> = [
    ...kMonth.rows.map((r, i) => ({ label: KELURAHAN_LIST[i].kunjunganLabel, row: r })),
    { label: 'JUMLAH', row: kMonth.totals, isTotal: true },
  ];

  const lAllRows: Array<{ label: string; row: LayananComputed; isTotal?: boolean }> = [
    ...lMonth.rows.map((r, i) => ({ label: KELURAHAN_LIST[i].layananLabel, row: r })),
    { label: 'JUMLAH', row: lMonth.totals, isTotal: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <label htmlFor="preview-month" className="text-sm font-medium text-slate-700">
            Bulan:
          </label>
          <select
            id="preview-month"
            value={month}
            onChange={(e) => onChangeMonth(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900"
          >
            {MONTH_TITLES.map((t, i) => (
              <option key={t} value={i + 1}>
                {t} {year}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setSheet('kunjungan')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              sheet === 'kunjungan' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
            }`}
          >
            Lap. Kunjungan
          </button>
          <button
            type="button"
            onClick={() => setSheet('layanan')}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
              sheet === 'layanan' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
            }`}
          >
            Lap. Layanan Lansia
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {sheet === 'kunjungan' ? (
          <table className="min-w-max border-collapse text-xs tabular-nums">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-3 py-2 text-left">
                  Kelurahan
                </th>
                <th className="border border-slate-200 px-2 py-2">Posyandu</th>
                <th className="border border-slate-200 px-2 py-2">PTM</th>
                <th className="border border-slate-200 px-2 py-2">Kader</th>
                <th className="border border-slate-200 px-2 py-2">Sas 45-59</th>
                <th className="border border-slate-200 px-2 py-2">Sas 60-69</th>
                <th className="border border-slate-200 px-2 py-2">Sas &gt;70</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Total &gt;60</th>
                <th className="border border-slate-200 px-2 py-2">DG Baru 45-59</th>
                <th className="border border-slate-200 px-2 py-2">DG Baru 60-69</th>
                <th className="border border-slate-200 px-2 py-2">DG Baru &gt;70</th>
                <th className="border border-slate-200 px-2 py-2">LG Baru 45-59</th>
                <th className="border border-slate-200 px-2 py-2">LG Baru 60-69</th>
                <th className="border border-slate-200 px-2 py-2">LG Baru &gt;70</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Komdat L</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Komdat P</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Komdat Tot</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">%</th>
                <th className="border border-slate-200 px-2 py-2">Kem 60-69 (A/B/C)</th>
                <th className="border border-slate-200 px-2 py-2">Kem &gt;70 (A/B/C)</th>
              </tr>
            </thead>
            <tbody>
              {kAllRows.map(({ label, row, isTotal }) => (
                <tr key={label} className={isTotal ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                  <td
                    className={`sticky left-0 z-10 border border-slate-200 px-3 py-2 text-left ${
                      isTotal ? 'bg-slate-100' : 'bg-white'
                    }`}
                  >
                    {label}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.jmlPosyandu)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.posyanduPtm)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.jmlKader)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.sas45_59L) + n(row.sas45_59P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.sas60_69L) + n(row.sas60_69P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.sas70L) + n(row.sas70P)}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right font-semibold">
                    {row.sasTotal60}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.dg45_59L)} / {n(row.dg45_59P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.dg60_69L)} / {n(row.dg60_69P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.dg70L)} / {n(row.dg70P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.lg45_59L)} / {n(row.lg45_59P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.lg60_69L)} / {n(row.lg60_69P)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.lg70L)} / {n(row.lg70P)}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right">
                    {row.komdatL}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right">
                    {row.komdatP}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right font-semibold">
                    {row.komdatTotal}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right font-semibold">
                    {row.komdatPct.toFixed(1)}%
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.kem60_69A)}/{n(row.kem60_69B)}/{n(row.kem60_69C)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.kem70A)}/{n(row.kem70B)}/{n(row.kem70C)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="min-w-max border-collapse text-xs tabular-nums">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="sticky left-0 z-10 border border-slate-200 bg-slate-50 px-3 py-2 text-left">
                  Kelurahan
                </th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Sas &gt;60</th>
                {KELAINAN_DEFINITIONS.map((d) => (
                  <th key={d.id} className="border border-slate-200 px-2 py-2">
                    {d.label.split(' (')[0]} (L/P)
                  </th>
                ))}
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Kelainan L</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Kelainan P</th>
                <th className="border border-slate-200 px-2 py-2 bg-teal-50">Total Kelainan</th>
                <th className="border border-slate-200 px-2 py-2">Edukasi / Obat / Rujuk</th>
                <th className="border border-slate-200 px-2 py-2">Konseling (B/L/S)</th>
                <th className="border border-slate-200 px-2 py-2">Penyuluhan</th>
                <th className="border border-slate-200 px-2 py-2">Aktif Kerja</th>
                <th className="border border-slate-200 px-2 py-2">Homecare</th>
              </tr>
            </thead>
            <tbody>
              {lAllRows.map(({ label, row, isTotal }) => (
                <tr key={label} className={isTotal ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'}>
                  <td
                    className={`sticky left-0 z-10 border border-slate-200 px-3 py-2 text-left ${
                      isTotal ? 'bg-slate-100' : 'bg-white'
                    }`}
                  >
                    {label}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right font-semibold">
                    {row.sasTotal60}
                  </td>
                  {KELAINAN_DEFINITIONS.map((d) => (
                    <td key={d.id} className="border border-slate-200 px-2 py-2 text-right">
                      {n(row[d.lKey] as number | null)} / {n(row[d.pKey] as number | null)}
                    </td>
                  ))}
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right">
                    {row.kelainanL}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right">
                    {row.kelainanP}
                  </td>
                  <td className="border border-slate-200 bg-teal-50/50 px-2 py-2 text-right font-semibold">
                    {row.kelainanTotal}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.diedukasi)} / {n(row.diobati)} / {n(row.dirujuk)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">
                    {n(row.konselingBaru)}/{n(row.konselingLama)}/{n(row.konselingSelesai)}
                  </td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.penyuluhan)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.aktifBekerja)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{n(row.homecare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
