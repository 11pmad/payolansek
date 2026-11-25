import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import {
  KELURAHAN_LIST,
  MONTH_TITLES,
  type KunjunganInput,
  type LayananInput,
  type YearReportData,
} from '../../shared/types.js';
import {
  computeMonthLayanan,
  computeYearKunjungan,
  getKunjunganWarnings,
} from '../../shared/calculations.js';
import { KunjunganFormSteps, type KunjunganStepId } from './KunjunganFormSteps.js';
import { LayananFormSteps, type LayananStepId } from './LayananFormSteps.js';

interface InputWorkspaceProps {
  report: YearReportData;
  month: number;
  kelurahanIdx: number;
  sheet: 'kunjungan' | 'layanan';
  onChangeMonth: (month: number) => void;
  onChangeKelurahan: (idx: number) => void;
  onChangeSheet: (sheet: 'kunjungan' | 'layanan') => void;
  onSaveKunjungan: (month: number, kelurahanIdx: number, data: KunjunganInput) => Promise<void>;
  onSaveLayanan: (month: number, kelurahanIdx: number, data: LayananInput) => Promise<void>;
  onCopyPosyanduPrevMonth: (targetMonth: number, kelurahanIdx: number) => Promise<void>;
}

export function InputWorkspace({
  report,
  month,
  kelurahanIdx,
  sheet,
  onChangeMonth,
  onChangeKelurahan,
  onChangeSheet,
  onSaveKunjungan,
  onSaveLayanan,
  onCopyPosyanduPrevMonth,
}: InputWorkspaceProps) {
  const [kStep, setKStep] = useState<KunjunganStepId>('dalam');
  const [lStep, setLStep] = useState<LayananStepId>('kelainan');
  const [kDraft, setKDraft] = useState<KunjunganInput>(report.kunjungan[month][kelurahanIdx]);
  const [lDraft, setLDraft] = useState<LayananInput>(report.layanan[month][kelurahanIdx]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    setKDraft(report.kunjungan[month][kelurahanIdx]);
    setLDraft(report.layanan[month][kelurahanIdx]);
    setIsDirty(false);
  }, [report, month, kelurahanIdx]);

  // Live compute with unsaved draft overlaid
  const liveKunjunganYear = useMemo(() => {
    const cloned: Record<number, KunjunganInput[]> = {};
    for (let m = 1; m <= 12; m++) {
      cloned[m] = [...(report.kunjungan[m] ?? [])];
    }
    cloned[month][kelurahanIdx] = kDraft;
    return computeYearKunjungan(cloned);
  }, [report.kunjungan, month, kelurahanIdx, kDraft]);

  const liveLayananMonth = useMemo(() => {
    const rows = [...(report.layanan[month] ?? [])];
    rows[kelurahanIdx] = lDraft;
    return computeMonthLayanan(month, rows);
  }, [report.layanan, month, kelurahanIdx, lDraft]);

  const currentKComputed = liveKunjunganYear[month].rows[kelurahanIdx];
  const currentLComputed = liveLayananMonth.rows[kelurahanIdx];
  const warnings = useMemo(() => getKunjunganWarnings(currentKComputed), [currentKComputed]);

  const performSave = async () => {
    setIsSaving(true);
    try {
      if (sheet === 'kunjungan') {
        await onSaveKunjungan(month, kelurahanIdx, kDraft);
      } else {
        await onSaveLayanan(month, kelurahanIdx, lDraft);
      }
      setIsDirty(false);
      setSavedBanner(
        `Tersimpan: ${KELURAHAN_LIST[kelurahanIdx].name} (${MONTH_TITLES[month - 1]} ${report.year})`,
      );
      window.setTimeout(() => setSavedBanner(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save dirty draft before switching month/kelurahan/sheet so user never loses numbers
  const withAutoSave = async (fn: () => void) => {
    if (isDirty) {
      await performSave();
    }
    fn();
  };

  // Ctrl+S shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (!isSaving) void performSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleSaveAndNext = async () => {
    await performSave();
    if (kelurahanIdx < KELURAHAN_LIST.length - 1) {
      onChangeKelurahan(kelurahanIdx + 1);
      if (sheet === 'kunjungan') setKStep('dalam');
      else setLStep('kelainan');
    } else if (sheet === 'kunjungan') {
      onChangeKelurahan(0);
      onChangeSheet('layanan');
      setLStep('kelainan');
    }
  };

  const handleCopyPosyandu = async () => {
    if (month <= 1) return;
    setIsCopying(true);
    try {
      await onCopyPosyanduPrevMonth(month, kelurahanIdx);
      setSavedBanner(`Data Posyandu & JKN disalin dari ${MONTH_TITLES[month - 2]}`);
      window.setTimeout(() => setSavedBanner(null), 3000);
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar: Month + Kelurahan + Sheet Switcher */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Month Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={month <= 1}
              aria-label="Bulan sebelumnya"
              onClick={() => void withAutoSave(() => onChangeMonth(month - 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>

            <label htmlFor="input-month-select" className="sr-only">
              Pilih Bulan
            </label>
            <select
              id="input-month-select"
              value={month}
              onChange={(e) => {
                const nextM = Number(e.target.value);
                void withAutoSave(() => onChangeMonth(nextM));
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            >
              {MONTH_TITLES.map((t, i) => (
                <option key={t} value={i + 1}>
                  {t} {report.year}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={month >= 12}
              aria-label="Bulan berikutnya"
              onClick={() => void withAutoSave(() => onChangeMonth(month + 1))}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Sheet Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => void withAutoSave(() => onChangeSheet('kunjungan'))}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sheet === 'kunjungan'
                  ? 'bg-white text-[#0D7A6F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Lap. Kunjungan
            </button>
            <button
              type="button"
              onClick={() => void withAutoSave(() => onChangeSheet('layanan'))}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                sheet === 'layanan'
                  ? 'bg-white text-[#0D7A6F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Lap. Layanan Lansia
            </button>
          </div>

          {/* Save Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {isDirty && (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                Belum disimpan
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void performSave()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-[#0D7A6F]" aria-hidden="true" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan (Ctrl+S)'}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => void handleSaveAndNext()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0A645B] disabled:opacity-50"
            >
              <span>
                {kelurahanIdx < KELURAHAN_LIST.length - 1
                  ? `Simpan & ${KELURAHAN_LIST[kelurahanIdx + 1].name}`
                  : sheet === 'kunjungan'
                    ? 'Simpan & Lanjut ke Layanan'
                    : 'Simpan Selesai'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* 6 Kelurahan Pills */}
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {KELURAHAN_LIST.map((kel) => {
            const active = kel.idx === kelurahanIdx;
            const filled =
              sheet === 'kunjungan'
                ? liveKunjunganYear[month].rows[kel.idx].hasInput
                : liveLayananMonth.rows[kel.idx].hasInput;

            return (
              <button
                key={kel.id}
                type="button"
                onClick={() => void withAutoSave(() => onChangeKelurahan(kel.idx))}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#0D7A6F] bg-[#0D7A6F] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {filled && (
                  <Check
                    className={`h-3.5 w-3.5 ${active ? 'text-teal-100' : 'text-emerald-600'}`}
                    aria-hidden="true"
                  />
                )}
                <span>
                  {kel.idx + 1}. {kel.name}
                </span>
              </button>
            );
          })}
        </div>

        {savedBanner && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{savedBanner}</span>
          </div>
        )}
      </div>

      {/* Main Form + Sticky Live Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-8">
          {sheet === 'kunjungan' ? (
            <KunjunganFormSteps
              month={month}
              kelurahanName={KELURAHAN_LIST[kelurahanIdx].name}
              step={kStep}
              onChangeStep={setKStep}
              draft={kDraft}
              computed={currentKComputed}
              onChangeField={(field, value) => {
                setKDraft((prev) => ({ ...prev, [field]: value }));
                setIsDirty(true);
              }}
              onCopyPosyanduPrevMonth={() => void handleCopyPosyandu()}
              isCopyingPosyandu={isCopying}
            />
          ) : (
            <LayananFormSteps
              kelurahanName={KELURAHAN_LIST[kelurahanIdx].name}
              step={lStep}
              onChangeStep={setLStep}
              draft={lDraft}
              computed={currentLComputed}
              onChangeNum={(field, value) => {
                setLDraft((prev) => ({ ...prev, [field]: value }));
                setIsDirty(true);
              }}
              onChangeText={(value) => {
                setLDraft((prev) => ({ ...prev, keterangan: value }));
                setIsDirty(true);
              }}
            />
          )}
        </div>

        {/* Sticky Live Summary */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Hasil Hitung Otomatis — {KELURAHAN_LIST[kelurahanIdx].name}
              </h3>
              <p className="mb-4 text-xs text-slate-500">
                {MONTH_TITLES[month - 1]} {report.year} (diperbarui langsung saat mengetik)
              </p>

              {sheet === 'kunjungan' ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kunjungan Baru Bln Ini</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {currentKComputed.kunjunganBaruBulanIni}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>• Dalam Gedung / Luar Gedung</span>
                    <span className="tabular-nums">
                      {currentKComputed.dalamGedungBaruBulanIni} /{' '}
                      {currentKComputed.luarGedungBaruBulanIni}
                    </span>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="flex justify-between">
                    <span className="text-slate-600">Sasaran Lansia &gt;60 Th</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {currentKComputed.sasTotal60}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kumulatif Komdat &gt;60 Th</span>
                    <span className="font-semibold text-[#0D7A6F] tabular-nums">
                      {currentKComputed.komdatTotal} (L:{currentKComputed.komdatL}, P:
                      {currentKComputed.komdatP})
                    </span>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-slate-600">Capaian Standar (&gt;60 Th)</span>
                      <span className="font-bold text-[#0D7A6F] tabular-nums">
                        {currentKComputed.komdatPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0D7A6F] transition-all"
                        style={{ width: `${Math.min(100, currentKComputed.komdatPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sasaran Layanan &gt;60 Th</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {currentLComputed.sasTotal60}
                    </span>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kelainan Laki-laki (AL)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {currentLComputed.kelainanL}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kelainan Perempuan (AM)</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {currentLComputed.kelainanP}
                    </span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[#F0FDFA] px-3 py-2 font-semibold text-[#0A645B]">
                    <span>Total Kelainan (AN)</span>
                    <span className="tabular-nums">{currentLComputed.kelainanTotal}</span>
                  </div>
                </div>
              )}
            </div>

            {sheet === 'kunjungan' && warnings.length > 0 && (
              <div
                role="alert"
                className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>Peringatan Pengecekan</span>
                </div>
                <ul className="list-disc space-y-1 pl-4">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
