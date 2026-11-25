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
  type AuthUser,
  type KunjunganInput,
  type LayananInput,
  type YearReportData,
} from '../../shared/types.js';
import {
  computeMonthLayanan,
  computeYearKunjungan,
  getKunjunganWarnings,
} from '../../shared/calculations.js';
import {
  getUnifiedStepStates,
  UNIFIED_STEPS,
  UnifiedFormSteps,
  type UnifiedStepId,
} from './UnifiedFormSteps.js';

interface InputWorkspaceProps {
  user: AuthUser;
  report: YearReportData;
  month: number;
  kelurahanIdx: number;
  step: UnifiedStepId;
  onChangeMonth: (month: number) => void;
  onChangeKelurahan: (idx: number) => void;
  onChangeStep: (step: UnifiedStepId) => void;
  onSaveKunjungan: (month: number, kelurahanIdx: number, data: KunjunganInput) => Promise<void>;
  onSaveLayanan: (month: number, kelurahanIdx: number, data: LayananInput) => Promise<void>;
  onCopyPosyanduPrevMonth: (targetMonth: number, kelurahanIdx: number) => Promise<void>;
}

export function InputWorkspace({
  user,
  report,
  month,
  kelurahanIdx,
  step,
  onChangeMonth,
  onChangeKelurahan,
  onChangeStep,
  onSaveKunjungan,
  onSaveLayanan,
  onCopyPosyanduPrevMonth,
}: InputWorkspaceProps) {
  const lockedKelIdx = user.role === 'petugas' && user.kelurahanIdx !== null ? user.kelurahanIdx : null;
  const [kDraft, setKDraft] = useState<KunjunganInput>(report.kunjungan[month][kelurahanIdx]);
  const [lDraft, setLDraft] = useState<LayananInput>(report.layanan[month][kelurahanIdx]);
  const [dirtyK, setDirtyK] = useState(false);
  const [dirtyL, setDirtyL] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const isDirty = dirtyK || dirtyL;

  useEffect(() => {
    setKDraft(report.kunjungan[month][kelurahanIdx]);
    setLDraft(report.layanan[month][kelurahanIdx]);
    setDirtyK(false);
    setDirtyL(false);
  }, [report, month, kelurahanIdx]);

  // Live compute with unsaved drafts overlaid
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
  const unifiedStepStates = useMemo(
    () => getUnifiedStepStates(kDraft, lDraft),
    [kDraft, lDraft],
  );

  const performSave = async () => {
    setIsSaving(true);
    try {
      const ops: Promise<void>[] = [];
      if (dirtyK || !dirtyL) ops.push(onSaveKunjungan(month, kelurahanIdx, kDraft));
      if (dirtyL || !dirtyK) ops.push(onSaveLayanan(month, kelurahanIdx, lDraft));
      await Promise.all(ops);
      setDirtyK(false);
      setDirtyL(false);
      setSavedBanner(
        `Tersimpan: ${KELURAHAN_LIST[kelurahanIdx].name} (${MONTH_TITLES[month - 1]} ${report.year})`,
      );
      window.setTimeout(() => setSavedBanner(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const withAutoSave = async (fn: () => void) => {
    if (isDirty) {
      await performSave();
    }
    fn();
  };

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
    if (lockedKelIdx === null && kelurahanIdx < KELURAHAN_LIST.length - 1) {
      onChangeKelurahan(kelurahanIdx + 1);
      onChangeStep('kunjungan');
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
      {/* Unified Top Toolbar: Month + Save Actions + 6 Kelurahan */}
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
                {lockedKelIdx === null && kelurahanIdx < KELURAHAN_LIST.length - 1
                  ? `Simpan & ${KELURAHAN_LIST[kelurahanIdx + 1].name}`
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
            const disabled = lockedKelIdx !== null && kel.idx !== lockedKelIdx;
            const kFilled = liveKunjunganYear[month].rows[kel.idx].hasInput;
            const lFilled = liveLayananMonth.rows[kel.idx].hasInput;
            const bothFilled = kFilled && lFilled;
            const partialFilled = kFilled || lFilled;

            return (
              <button
                key={kel.id}
                type="button"
                disabled={disabled}
                title={
                  disabled
                    ? `Akun Anda khusus Kelurahan ${KELURAHAN_LIST[lockedKelIdx!]?.name}`
                    : undefined
                }
                onClick={() => void withAutoSave(() => onChangeKelurahan(kel.idx))}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-[#0D7A6F] bg-[#0D7A6F] text-white'
                    : disabled
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {bothFilled ? (
                  <Check
                    className={`h-3.5 w-3.5 ${active ? 'text-teal-100' : 'text-emerald-600'}`}
                    aria-hidden="true"
                  />
                ) : partialFilled ? (
                  <span
                    className={`h-2 w-2 rounded-full ${active ? 'bg-amber-200' : 'bg-amber-500'}`}
                    aria-hidden="true"
                  />
                ) : null}
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

      {/* Main Unified Form + Sticky Live Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-8">
          <UnifiedFormSteps
            month={month}
            kelurahanName={KELURAHAN_LIST[kelurahanIdx].name}
            step={step}
            onChangeStep={onChangeStep}
            kDraft={kDraft}
            lDraft={lDraft}
            kComputed={currentKComputed}
            lComputed={currentLComputed}
            onChangeKunjungan={(field, value) => {
              setKDraft((prev) => ({ ...prev, [field]: value }));
              setDirtyK(true);
            }}
            onChangeLayananNum={(field, value) => {
              setLDraft((prev) => ({ ...prev, [field]: value }));
              setDirtyL(true);
            }}
            onChangeLayananText={(value) => {
              setLDraft((prev) => ({ ...prev, keterangan: value }));
              setDirtyL(true);
            }}
            onCopyPosyanduPrevMonth={() => void handleCopyPosyandu()}
            isCopyingPosyandu={isCopying}
          />
        </div>

        {/* Sticky Live Summary */}
        <aside className="space-y-4 lg:col-span-4">
          <div className="sticky top-28 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Ringkasan Langsung — {KELURAHAN_LIST[kelurahanIdx].name}
              </h3>
              <p className="mb-3 text-xs text-slate-500">
                {MONTH_TITLES[month - 1]} {report.year} (diperbarui otomatis)
              </p>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Kunjungan Baru Bln Ini</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {currentKComputed.kunjunganBaruBulanIni}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>• Dalam / Luar Gedung</span>
                  <span className="tabular-nums">
                    {currentKComputed.dalamGedungBaruBulanIni} /{' '}
                    {currentKComputed.luarGedungBaruBulanIni}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Komdat &gt;60 Th</span>
                  <span className="font-semibold text-[#0D7A6F] tabular-nums">
                    {currentKComputed.komdatTotal} / {currentKComputed.sasTotal60}
                  </span>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-medium text-slate-600">Capaian Standar (&gt;60 Th)</span>
                    <span className="font-bold text-[#0D7A6F] tabular-nums">
                      {currentKComputed.komdatPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#0D7A6F] transition-all"
                      style={{ width: `${Math.min(100, currentKComputed.komdatPct)}%` }}
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="flex justify-between rounded-lg bg-[#F0FDFA] px-3 py-2 text-xs font-semibold text-[#0A645B]">
                  <span>Total Kelainan (L / P)</span>
                  <span className="tabular-nums">
                    {currentLComputed.kelainanTotal} ({currentLComputed.kelainanL} /{' '}
                    {currentLComputed.kelainanP})
                  </span>
                </div>
              </div>
            </div>

            {/* Unified 4-Step Checklist */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Kelengkapan 4 Langkah
              </h4>
              <div className="space-y-1.5">
                {UNIFIED_STEPS.map((s) => {
                  const st = unifiedStepStates[s.id];
                  const active = step === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onChangeStep(s.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                        active
                          ? 'border-[#0D7A6F] bg-[#F0FDFA]'
                          : 'border-slate-100 bg-slate-50/70 hover:bg-slate-100/70'
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-slate-800">
                          {s.num}. {st.title}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-500 tabular-nums">
                          ({st.filledCount}/{st.totalCount})
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          st.filled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {st.filled ? 'Terisi' : 'Kosong'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {warnings.length > 0 && (
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
