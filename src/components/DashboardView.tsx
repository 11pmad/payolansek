import { useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Stethoscope,
  Users,
} from 'lucide-react';
import {
  KELURAHAN_LIST,
  MONTH_TITLES,
  type KunjunganMonthComputed,
  type LayananMonthComputed,
} from '../../shared/types.js';

interface DashboardViewProps {
  year: number;
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
  kunjunganYear: Record<number, KunjunganMonthComputed>;
  layananYear: Record<number, LayananMonthComputed>;
  onGoToInput: (month: number, kelurahanIdx: number, sheet: 'kunjungan' | 'layanan') => void;
}

export function DashboardView({
  year,
  selectedMonth,
  onSelectMonth,
  kunjunganYear,
  layananYear,
  onGoToInput,
}: DashboardViewProps) {
  const [showAllMonths, setShowAllMonths] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthK = kunjunganYear[selectedMonth];
  const monthL = layananYear[selectedMonth];

  const pctTotal = monthK?.totals.komdatPct ?? 0;

  const statusDot =
    monthK.filledCount === 6 && monthL.filledCount === 6
      ? 'bg-emerald-600'
      : monthK.filledCount > 0 || monthL.filledCount > 0
        ? 'bg-amber-500'
        : 'bg-slate-300';

  return (
    <div className="space-y-4">
      {/* Compact Single-Row Period Bar + Collapsible 12-Month Grid */}
      <section aria-label="Pilih bulan laporan" className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Left: Prev / Select / Next / Quick Jump */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={selectedMonth <= 1}
              aria-label="Bulan sebelumnya"
              onClick={() => onSelectMonth(selectedMonth - 1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <label htmlFor="dash-month-select" className="sr-only">
              Pilih Bulan Laporan
            </label>
            <select
              id="dash-month-select"
              value={selectedMonth}
              onChange={(e) => onSelectMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20"
            >
              {MONTH_TITLES.map((title, idx) => {
                const m = idx + 1;
                const isCur = year === currentYear && m === currentMonth;
                return (
                  <option key={m} value={m}>
                    {title} {year}
                    {isCur ? ' (Bulan Ini)' : ''}
                  </option>
                );
              })}
            </select>

            <button
              type="button"
              disabled={selectedMonth >= 12}
              aria-label="Bulan berikutnya"
              onClick={() => onSelectMonth(selectedMonth + 1)}
              className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>

            {year === currentYear && selectedMonth !== currentMonth && (
              <button
                type="button"
                onClick={() => onSelectMonth(currentMonth)}
                className="ml-1 rounded-lg border border-[#0D7A6F]/30 bg-[#F0FDFA] px-2.5 py-1 text-xs font-semibold text-[#0D7A6F] hover:bg-teal-100/70"
              >
                Bulan Ini
              </button>
            )}
          </div>

          {/* Right: Inline Status + Toggle 12-Month Drawer */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-slate-600 tabular-nums">
              <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
              <span>
                Kunj. <strong className="text-slate-900">{monthK.filledCount}/6</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span>
                Lay. <strong className="text-slate-900">{monthL.filledCount}/6</strong>
              </span>
            </div>

            <button
              type="button"
              aria-expanded={showAllMonths}
              onClick={() => setShowAllMonths((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <CalendarDays className="h-3.5 w-3.5 text-[#0D7A6F]" aria-hidden="true" />
              <span>Semua Bulan</span>
              {showAllMonths ? (
                <ChevronUp className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Collapsible 12-Month Grid */}
        {showAllMonths && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {MONTH_TITLES.map((title, idx) => {
                const m = idx + 1;
                const kFilled = kunjunganYear[m]?.filledCount ?? 0;
                const lFilled = layananYear[m]?.filledCount ?? 0;
                const isSelected = m === selectedMonth;
                const isCurrentCal = year === currentYear && m === currentMonth;
                const isFuture = year > currentYear || (year === currentYear && m > currentMonth);
                const pctProgress = ((kFilled + lFilled) / 12) * 100;

                const barColor =
                  kFilled === 6 && lFilled === 6
                    ? 'bg-emerald-600'
                    : kFilled > 0 || lFilled > 0
                      ? 'bg-amber-500'
                      : 'bg-slate-300';

                return (
                  <button
                    key={m}
                    type="button"
                    title={`${title} ${year}: Kunjungan ${kFilled}/6, Layanan ${lFilled}/6`}
                    onClick={() => {
                      onSelectMonth(m);
                      setShowAllMonths(false);
                    }}
                    className={`flex flex-col rounded-lg border px-2.5 py-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/30 ${
                      isSelected
                        ? 'border-[#0D7A6F] bg-[#F0FDFA]'
                        : isCurrentCal
                          ? 'border-[#0D7A6F]/40 bg-white ring-1 ring-[#0D7A6F]/25 hover:bg-slate-50'
                          : isFuture
                            ? 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/70'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-1">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#0A645B]' : isFuture ? 'text-slate-500' : 'text-slate-900'
                        }`}
                      >
                        {title}
                      </span>
                      {isCurrentCal && (
                        <span className="rounded-full bg-[#0D7A6F] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                          Ini
                        </span>
                      )}
                    </div>
                    <span className="mt-1 text-[11px] text-slate-500 tabular-nums">
                      {kFilled}/6 • {lFilled}/6
                    </span>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pctProgress}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4 KPI Cards */}
      <section aria-label="Ringkasan capaian bulan terpilih" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Sasaran Lansia &gt;60 Th</span>
            <Users className="h-4 w-4 text-[#0D7A6F]" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {monthK.totals.sasTotal60.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            L: {( (monthK.totals.sas60_69L ?? 0) + (monthK.totals.sas70L ?? 0) ).toLocaleString('id-ID')} • P:{' '}
            {( (monthK.totals.sas60_69P ?? 0) + (monthK.totals.sas70P ?? 0) ).toLocaleString('id-ID')}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Dilayani Standar &gt;60 Th (Komdat)
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">
              {monthK.totals.komdatTotal.toLocaleString('id-ID')}
            </p>
            <span className="rounded-md bg-[#ECFDF5] px-2 py-0.5 text-xs font-semibold text-[#0D7A6F] tabular-nums">
              {pctTotal.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#0D7A6F] transition-all"
              style={{ width: `${Math.min(100, pctTotal)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Kunjungan Baru ({MONTH_TITLES[selectedMonth - 1]})
            </span>
            <Clock className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {monthK.totals.kunjunganBaruBulanIni.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Dalam Gedung: {monthK.totals.dalamGedungBaruBulanIni} • Luar Gedung:{' '}
            {monthK.totals.luarGedungBaruBulanIni}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Layanan dgn Kelainan ({MONTH_TITLES[selectedMonth - 1]})
            </span>
            <Stethoscope className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 tabular-nums">
            {monthL.totals.kelainanTotal.toLocaleString('id-ID')}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Laki-laki: {monthL.totals.kelainanL} • Perempuan: {monthL.totals.kelainanP}
          </p>
        </div>
      </section>

      {/* Chart + Kelurahan Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Monthly Trend SVG Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-900">Tren Capaian Komdat &gt;60 Th</h3>
          <p className="mb-3 text-xs text-slate-500">Persentase kumulatif Puskesmas Jan–Des {year}</p>

          <div className="space-y-1.5">
            {MONTH_TITLES.map((title, idx) => {
              const m = idx + 1;
              const mData = kunjunganYear[m];
              const pct = mData?.totals.komdatPct ?? 0;
              const filled = mData?.filledCount > 0;
              const isCurrent = m === selectedMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectMonth(m)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors ${
                    isCurrent ? 'bg-[#F0FDFA]' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-8 text-xs font-medium text-slate-600">{title.slice(0, 3)}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        filled ? (isCurrent ? 'bg-[#0D7A6F]' : 'bg-teal-500/75') : 'bg-slate-200'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs font-semibold text-slate-700 tabular-nums">
                    {filled ? `${pct.toFixed(1)}%` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6 Kelurahan Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Rincian per Kelurahan — {MONTH_TITLES[selectedMonth - 1]} {year}
              </h3>
              <p className="text-xs text-slate-500">
                Klik tombol Input untuk mengisi atau memperbaiki angka kelurahan tertentu.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onGoToInput(selectedMonth, 0, 'kunjungan')}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0D7A6F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A645B]"
            >
              <span>Mulai Input Bulan Ini</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-semibold">Kelurahan</th>
                  <th className="px-3 py-2 text-right font-semibold">Kunj. Baru</th>
                  <th className="px-3 py-2 text-right font-semibold">Komdat &gt;60</th>
                  <th className="px-3 py-2 font-semibold">Capaian</th>
                  <th className="px-3 py-2 text-right font-semibold">Kelainan</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {KELURAHAN_LIST.map((kel, idx) => {
                  const kRow = monthK.rows[idx];
                  const lRow = monthL.rows[idx];
                  const pct = kRow.komdatPct;
                  return (
                    <tr key={kel.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-medium text-slate-900">{kel.name}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                        {kRow.kunjunganBaruBulanIni}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                        {kRow.komdatTotal} / {kRow.sasTotal60}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#0D7A6F]"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">
                        {lRow.kelainanTotal}
                      </td>
                      <td className="px-3 py-2.5">
                        {kRow.hasInput && lRow.hasInput ? (
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            Lengkap
                          </span>
                        ) : kRow.hasInput || lRow.hasInput ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            {kRow.hasInput ? 'Layanan kosong' : 'Kunj. kosong'}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Kosong
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => onGoToInput(selectedMonth, idx, 'kunjungan')}
                          className="text-xs font-semibold text-[#0D7A6F] hover:text-[#0A645B] hover:underline"
                        >
                          Input →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-4 py-2.5">JUMLAH PUSKESMAS</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {monthK.totals.kunjunganBaruBulanIni}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {monthK.totals.komdatTotal} / {monthK.totals.sasTotal60}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">{pctTotal.toFixed(1)}%</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{monthL.totals.kelainanTotal}</td>
                  <td colSpan={2} className="px-4 py-2.5 text-right text-xs font-normal text-slate-500">
                    Kunjungan {monthK.filledCount}/6 • Layanan {monthL.filledCount}/6
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
