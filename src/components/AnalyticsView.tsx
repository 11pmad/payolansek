import { useMemo, useState } from 'react';
import { Activity, Award, Building2, HeartHandshake } from 'lucide-react';
import {
  buildAgeGenderBreakdown,
  buildKelainanBreakdown,
  buildKelurahanRanking,
  buildKemandirianAndService,
  buildMonthlyTrend,
} from '../../shared/analytics.js';
import {
  KELURAHAN_LIST,
  MONTH_TITLES,
  type KunjunganMonthComputed,
  type LayananMonthComputed,
} from '../../shared/types.js';
import {
  AgeGenderChart,
  KelainanChart,
  KelurahanTargetChart,
  KemandirianDonutChart,
  TrendChart,
} from './AnalyticsCharts.js';

interface AnalyticsViewProps {
  year: number;
  selectedMonth: number;
  onChangeMonth: (month: number) => void;
  kunjunganYear: Record<number, KunjunganMonthComputed>;
  layananYear: Record<number, LayananMonthComputed>;
}

export function AnalyticsView({
  year,
  selectedMonth,
  onChangeMonth,
  kunjunganYear,
  layananYear,
}: AnalyticsViewProps) {
  const [kelurahanFilter, setKelurahanFilter] = useState<'all' | number>('all');
  const [periodMode, setPeriodMode] = useState<'month' | 'ytd'>('month');

  const kelIdx = kelurahanFilter === 'all' ? null : kelurahanFilter;
  const kMonth = kunjunganYear[selectedMonth];

  const trendData = useMemo(
    () => buildMonthlyTrend(kunjunganYear, kelIdx),
    [kunjunganYear, kelIdx],
  );

  const rankingData = useMemo(
    () => buildKelurahanRanking(kMonth),
    [kMonth],
  );

  const ageGenderData = useMemo(
    () => buildAgeGenderBreakdown(kMonth, kelIdx),
    [kMonth, kelIdx],
  );

  const kelainanData = useMemo(
    () => buildKelainanBreakdown(layananYear, selectedMonth, periodMode, kelIdx),
    [layananYear, selectedMonth, periodMode, kelIdx],
  );

  const kemandirianAndService = useMemo(
    () =>
      buildKemandirianAndService(
        kunjunganYear,
        layananYear,
        selectedMonth,
        periodMode,
        kelIdx,
      ),
    [kunjunganYear, layananYear, selectedMonth, periodMode, kelIdx],
  );

  const topKel = rankingData[0];
  const lowKel = rankingData[rankingData.length - 1];
  const topKelainan = kelainanData[0];

  const currentTrendPoint = trendData[selectedMonth - 1];
  const periodVisitDalam =
    periodMode === 'ytd'
      ? trendData.slice(0, selectedMonth).reduce((s, d) => s + d.dalamGedungBaru, 0)
      : currentTrendPoint?.dalamGedungBaru ?? 0;
  const periodVisitLuar =
    periodMode === 'ytd'
      ? trendData.slice(0, selectedMonth).reduce((s, d) => s + d.luarGedungBaru, 0)
      : currentTrendPoint?.luarGedungBaru ?? 0;
  const periodVisitTotal = periodVisitDalam + periodVisitLuar;
  const dalamPct = periodVisitTotal > 0 ? (periodVisitDalam / periodVisitTotal) * 100 : 0;

  const periodLabel =
    periodMode === 'ytd'
      ? `Januari–${MONTH_TITLES[selectedMonth - 1]} ${year}`
      : `${MONTH_TITLES[selectedMonth - 1]} ${year}`;

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <section
        aria-label="Filter analisis data"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Analisis &amp; Visualisasi Data Lansia {year}
          </h2>
          <p className="text-xs text-slate-500">
            Periode aktif: <span className="font-medium text-slate-700">{periodLabel}</span> •{' '}
            {kelIdx === null ? 'Seluruh Kelurahan' : `Kelurahan ${KELURAHAN_LIST[kelIdx]?.name}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div>
            <label htmlFor="an-month" className="sr-only">
              Bulan Analisis
            </label>
            <select
              id="an-month"
              value={selectedMonth}
              onChange={(e) => onChangeMonth(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            >
              {MONTH_TITLES.map((t, i) => (
                <option key={t} value={i + 1}>
                  {t} {year}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setPeriodMode('month')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                periodMode === 'month' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Bulan Terpilih
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('ytd')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                periodMode === 'ytd' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Akumulasi Jan–Bulan
            </button>
          </div>

          <div>
            <label htmlFor="an-kel" className="sr-only">
              Filter Kelurahan
            </label>
            <select
              id="an-kel"
              value={kelurahanFilter === 'all' ? 'all' : String(kelurahanFilter)}
              onChange={(e) =>
                setKelurahanFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            >
              <option value="all">Semua Kelurahan (6)</option>
              {KELURAHAN_LIST.map((k) => (
                <option key={k.id} value={String(k.idx)}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 4 Insight Cards */}
      <section aria-label="Sorotan analisis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Capaian Tertinggi &amp; Terendah</span>
            <Award className="h-4 w-4 text-[#0D7A6F]" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 tabular-nums">
            {topKel ? `${topKel.name} (${topKel.komdatPct.toFixed(1)}%)` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Terendah: {lowKel ? `${lowKel.name} (${lowKel.komdatPct.toFixed(1)}%)` : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Dalam vs Luar Gedung</span>
            <Building2 className="h-4 w-4 text-sky-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 tabular-nums">
            {periodVisitTotal > 0
              ? `${dalamPct.toFixed(0)}% Dalam • ${(100 - dalamPct).toFixed(0)}% Luar`
              : 'Belum ada kunjungan'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {periodVisitDalam.toLocaleString('id-ID')} Dalam / {periodVisitLuar.toLocaleString('id-ID')} Luar
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kelainan Terbanyak</span>
            <Activity className="h-4 w-4 text-amber-600" aria-hidden="true" />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-900">
            {topKelainan && topKelainan.total > 0 ? topKelainan.label : 'Belum ada data'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {topKelainan && topKelainan.total > 0
              ? `${topKelainan.total} kasus (L:${topKelainan.l}, P:${topKelainan.p})`
              : 'Periode belum terisi'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Lansia Mandiri (Tingkat A)</span>
            <HeartHandshake className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 tabular-nums">
            {kemandirianAndService.kemandirian.total > 0
              ? `${kemandirianAndService.kemandirian.pctA.toFixed(1)}% Mandiri`
              : 'Belum dinilai'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            {kemandirianAndService.kemandirian.a} dari {kemandirianAndService.kemandirian.total} lansia dinilai
          </p>
        </div>
      </section>

      {/* Main Trend Chart */}
      <TrendChart data={trendData} selectedMonth={selectedMonth} />

      {/* Ranking & Age/Gender */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <KelurahanTargetChart items={rankingData} />
        <AgeGenderChart groups={ageGenderData} />
      </div>

      {/* Kelainan + Kemandirian & Tindak Lanjut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <KelainanChart items={kelainanData} />
        </div>
        <div className="lg:col-span-5">
          <KemandirianDonutChart
            kemandirian={kemandirianAndService.kemandirian}
            services={kemandirianAndService.services}
          />
        </div>
      </div>
    </div>
  );
}
