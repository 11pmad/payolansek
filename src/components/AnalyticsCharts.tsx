import { useState } from 'react';
import type {
  AgeGenderGroup,
  KelainanStatItem,
  KelurahanRankItem,
  MonthlyTrendPoint,
} from '../../shared/analytics.js';
import { MONTH_TITLES } from '../../shared/types.js';

export function TrendChart({
  data,
  selectedMonth,
}: {
  data: MonthlyTrendPoint[];
  selectedMonth: number;
}) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const activeMonth = hoveredMonth ?? selectedMonth;
  const activePoint = data.find((d) => d.month === activeMonth) ?? data[0];

  const maxVisit = Math.max(10, ...data.map((d) => d.totalBaru));
  const chartW = 720;
  const chartH = 230;
  const padL = 40;
  const padR = 40;
  const padT = 18;
  const padB = 30;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const stepX = plotW / 12;
  const barW = Math.min(28, stepX * 0.52);

  const linePoints = data
    .filter((d) => d.hasInput || d.komdatPct > 0)
    .map((d) => {
      const cx = padL + (d.month - 0.5) * stepX;
      const cy = padT + plotH - (Math.min(100, d.komdatPct) / 100) * plotH;
      return { cx, cy, d };
    });

  const polylineStr = linePoints.map((p) => `${p.cx.toFixed(1)},${p.cy.toFixed(1)}`).join(' ');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Tren Kunjungan Baru &amp; Capaian Komdat (&gt;60 Th)
          </h3>
          <p className="text-xs text-slate-500">
            Batang menunjukkan jumlah kunjungan baru bulanan; garis oranye menunjukkan % capaian kumulatif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#0D7A6F]" aria-hidden="true" />
            Dalam Gedung
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-sky-600" aria-hidden="true" />
            Luar Gedung
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-amber-600" aria-hidden="true" />
            Capaian %
          </span>
        </div>
      </div>

      {/* Inline Detail Bar */}
      {activePoint && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
          <span className="font-semibold text-slate-900">
            {MONTH_TITLES[activePoint.month - 1]}
          </span>
          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            <span className="text-slate-600">
              Dalam Gedung: <strong className="text-[#0D7A6F]">{activePoint.dalamGedungBaru}</strong>
            </span>
            <span className="text-slate-600">
              Luar Gedung: <strong className="text-sky-700">{activePoint.luarGedungBaru}</strong>
            </span>
            <span className="text-slate-600">
              Total Baru: <strong className="text-slate-900">{activePoint.totalBaru}</strong>
            </span>
            <span className="text-slate-600">
              Komdat &gt;60 Th:{' '}
              <strong className="text-amber-700">
                {activePoint.komdatTotal} ({activePoint.komdatPct.toFixed(1)}%)
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          role="img"
          aria-label="Grafik tren kunjungan baru dan capaian Komdat per bulan"
          className="h-56 w-full min-w-[540px]"
        >
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = padT + plotH * (1 - t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={chartW - padR}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padL - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums"
                >
                  {Math.round(maxVisit * t)}
                </text>
                <text
                  x={chartW - padR + 6}
                  y={y + 3}
                  textAnchor="start"
                  className="fill-amber-600/80 text-[10px] tabular-nums"
                >
                  {Math.round(t * 100)}%
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d) => {
            const cx = padL + (d.month - 0.5) * stepX;
            const x = cx - barW / 2;
            const dalamH = (d.dalamGedungBaru / maxVisit) * plotH;
            const luarH = (d.luarGedungBaru / maxVisit) * plotH;
            const yDalam = padT + plotH - dalamH;
            const yLuar = yDalam - luarH;
            const isHighlighted = d.month === activeMonth;

            return (
              <g
                key={d.month}
                onMouseEnter={() => setHoveredMonth(d.month)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="cursor-pointer"
              >
                <rect
                  x={padL + (d.month - 1) * stepX}
                  y={padT}
                  width={stepX}
                  height={plotH}
                  fill={isHighlighted ? '#F0FDFA' : 'transparent'}
                />
                {dalamH > 0 && (
                  <rect
                    x={x}
                    y={yDalam}
                    width={barW}
                    height={dalamH}
                    rx={luarH > 0 ? 0 : 3}
                    fill="#0D7A6F"
                    opacity={isHighlighted ? 1 : 0.85}
                  />
                )}
                {luarH > 0 && (
                  <rect
                    x={x}
                    y={yLuar}
                    width={barW}
                    height={luarH}
                    rx={3}
                    fill="#0284C7"
                    opacity={isHighlighted ? 1 : 0.85}
                  />
                )}
                <text
                  x={cx}
                  y={chartH - 10}
                  textAnchor="middle"
                  className={`text-[11px] ${
                    isHighlighted ? 'fill-[#0D7A6F] font-bold' : 'fill-slate-500'
                  }`}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Overlay Komdat % line */}
          {linePoints.length > 1 && (
            <polyline
              fill="none"
              stroke="#D97706"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              points={polylineStr}
            />
          )}
          {linePoints.map(({ cx, cy, d }) => (
            <circle
              key={d.month}
              cx={cx}
              cy={cy}
              r={d.month === activeMonth ? 4.5 : 3}
              fill="#FFFFFF"
              stroke="#D97706"
              strokeWidth="2"
              pointerEvents="none"
            />
          ))}
        </svg>
      </div>
    </section>
  );
}

export function KelurahanTargetChart({ items }: { items: KelurahanRankItem[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Peringkat Capaian Kelurahan (&gt;60 Th)
        </h3>
        <p className="text-xs text-slate-500">
          Perbandingan jumlah lansia dilayani standar terhadap sasaran target 100%.
        </p>
      </div>

      <div className="space-y-3.5">
        {items.map((item, idx) => {
          const pct = Math.min(100, item.komdatPct);
          const barColor =
            item.komdatPct >= 80
              ? 'bg-emerald-600'
              : item.komdatPct >= 50
                ? 'bg-[#0D7A6F]'
                : 'bg-amber-500';

          return (
            <div key={item.kelurahanIdx} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">
                  {idx + 1}. {item.name}
                </span>
                <span className="text-slate-600 tabular-nums">
                  <strong>{item.komdatTotal}</strong> / {item.sasTotal60} ({item.komdatPct.toFixed(1)}%)
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                <span>Kunjungan baru bulan ini: {item.kunjunganBaru}</span>
                <span>
                  {item.gapToTarget > 0 ? `Sisa sasaran: ${item.gapToTarget} lansia` : 'Target tercapai'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AgeGenderChart({ groups }: { groups: AgeGenderGroup[] }) {
  const maxVal = Math.max(10, ...groups.map((g) => Math.max(g.l, g.p)));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Sebaran Usia &amp; Jenis Kelamin (Kumulatif)
          </h3>
          <p className="text-xs text-slate-500">
            Jumlah lansia yang dilayani sesuai standar per kelompok umur.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-sky-600" aria-hidden="true" />
            Laki-laki
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-amber-600" aria-hidden="true" />
            Perempuan
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.ageLabel} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-900">{g.ageLabel}</span>
              <span className="text-slate-600 tabular-nums">
                Total: <strong>{g.total.toLocaleString('id-ID')}</strong> / Sasaran{' '}
                {g.sasaran.toLocaleString('id-ID')}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 font-medium text-slate-500">L</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-sky-600"
                    style={{ width: `${(g.l / maxVal) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-slate-800 tabular-nums">
                  {g.l}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="w-6 font-medium text-slate-500">P</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className="h-full rounded-full bg-amber-600"
                    style={{ width: `${(g.p / maxVal) * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right font-semibold text-slate-800 tabular-nums">
                  {g.p}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function KelainanChart({ items }: { items: KelainanStatItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const nonZero = items.filter((i) => i.total > 0);
  const visible = showAll ? items : nonZero.slice(0, 8);
  const maxVal = Math.max(1, ...items.map((i) => i.total));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Profil Kelainan Kesehatan Lansia
          </h3>
          <p className="text-xs text-slate-500">
            Distribusi temuan kelainan terbanyak berdasarkan jenis kelamin (L / P).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-sky-600" aria-hidden="true" />
              Laki-laki
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-amber-600" aria-hidden="true" />
              Perempuan
            </span>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {showAll ? 'Tampilkan Teratas' : 'Semua 14 Jenis'}
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-xs text-slate-500">
          Belum ada catatan kelainan pada periode ini.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => {
            const wL = (item.l / maxVal) * 100;
            const wP = (item.p / maxVal) * 100;
            return (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-800">{item.label}</span>
                  <span className="text-slate-600 tabular-nums">
                    L:{item.l} • P:{item.p} • <strong className="text-slate-900">{item.total}</strong>
                  </span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  {wL > 0 && (
                    <div
                      className="h-full bg-sky-600"
                      style={{ width: `${wL}%` }}
                      title={`Laki-laki: ${item.l}`}
                    />
                  )}
                  {wP > 0 && (
                    <div
                      className="h-full bg-amber-600"
                      style={{ width: `${wP}%` }}
                      title={`Perempuan: ${item.p}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function KemandirianDonutChart({
  kemandirian,
  services,
}: {
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
}) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  const segA = kemandirian.total > 0 ? (kemandirian.a / kemandirian.total) * circumference : 0;
  const segB = kemandirian.total > 0 ? (kemandirian.b / kemandirian.total) * circumference : 0;
  const segC = kemandirian.total > 0 ? (kemandirian.c / kemandirian.total) * circumference : 0;

  const maxSvc = Math.max(1, ...services.map((s) => s.value));

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Tingkat Kemandirian (ADL) &amp; Tindak Lanjut
        </h3>
        <p className="text-xs text-slate-500">
          Proporsi kemandirian usia &gt;60 tahun serta layanan pengobatan &amp; edukasi.
        </p>
      </div>

      {/* Donut */}
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90" role="img" aria-label="Proporsi kemandirian lansia">
            <circle cx="55" cy="55" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="14" />
            {kemandirian.total > 0 && (
              <>
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#0D7A6F"
                  strokeWidth="14"
                  strokeDasharray={`${segA} ${circumference}`}
                  strokeDashoffset={0}
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="14"
                  strokeDasharray={`${segB} ${circumference}`}
                  strokeDashoffset={-segA}
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="14"
                  strokeDasharray={`${segC} ${circumference}`}
                  strokeDashoffset={-(segA + segB)}
                />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {kemandirian.total}
            </span>
            <span className="text-[10px] text-slate-500">Dinilai</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0D7A6F]" aria-hidden="true" />
              Mandiri (A)
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {kemandirian.a} ({kemandirian.pctA.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-600" aria-hidden="true" />
              Sedang (B)
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {kemandirian.b} ({kemandirian.pctB.toFixed(1)}%)
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-hidden="true" />
              Berat (C)
            </span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {kemandirian.c} ({kemandirian.pctC.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Tindak Lanjut Bars */}
      <div className="space-y-2.5 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Layanan &amp; Tindak Lanjut
        </h4>
        {services.map((svc) => (
          <div key={svc.label} className="flex items-center gap-2 text-xs">
            <span className="w-24 shrink-0 text-slate-700">{svc.label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-600"
                style={{ width: `${(svc.value / maxSvc) * 100}%` }}
              />
            </div>
            <span className="w-12 text-right font-semibold text-slate-900 tabular-nums">
              {svc.value.toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
