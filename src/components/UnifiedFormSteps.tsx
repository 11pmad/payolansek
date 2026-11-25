import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import {
  MONTH_TITLES,
  type KunjunganComputed,
  type KunjunganInput,
  type LayananComputed,
  type LayananInput,
} from '../../shared/types.js';
import {
  getKunjunganStepStatus,
  getLayananStepStatus,
  KELAINAN_DEFINITIONS,
} from '../../shared/calculations.js';
import { NumericInput } from './NumericInput.js';

export type UnifiedStepId = 'kunjungan' | 'kemandirian' | 'kelainan' | 'tindak_lanjut';

interface UnifiedFormStepsProps {
  month: number;
  kelurahanName: string;
  step: UnifiedStepId;
  onChangeStep: (step: UnifiedStepId) => void;
  kDraft: KunjunganInput;
  lDraft: LayananInput;
  kComputed: KunjunganComputed;
  lComputed: LayananComputed;
  onChangeKunjungan: (field: keyof KunjunganInput, value: number | null) => void;
  onChangeLayananNum: (field: keyof LayananInput, value: number | null) => void;
  onChangeLayananText: (value: string) => void;
  onCopyPosyanduPrevMonth: () => void;
  isCopyingPosyandu: boolean;
}

export const UNIFIED_STEPS: ReadonlyArray<{
  id: UnifiedStepId;
  num: string;
  title: string;
}> = [
  { id: 'kunjungan', num: '1', title: 'Kunjungan' },
  { id: 'kemandirian', num: '2', title: 'Kemandirian' },
  { id: 'kelainan', num: '3', title: 'Kelainan' },
  { id: 'tindak_lanjut', num: '4', title: 'Tindak Lanjut' },
];

export function getUnifiedStepStates(kDraft: KunjunganInput, lDraft: LayananInput) {
  const kStatus = getKunjunganStepStatus(kDraft);
  const lStatus = getLayananStepStatus(lDraft);

  const step1FilledCount = kStatus.steps.dalam.filledCount + kStatus.steps.luar.filledCount;
  const step1TotalCount = kStatus.steps.dalam.totalCount + kStatus.steps.luar.totalCount;

  const step2FilledCount =
    kStatus.steps.kemandirian.filledCount + kStatus.steps.posyandu.filledCount;
  const step2TotalCount =
    kStatus.steps.kemandirian.totalCount + kStatus.steps.posyandu.totalCount;

  const step3FilledCount = lStatus.steps.kelainan.filledCount;
  const step3TotalCount = lStatus.steps.kelainan.totalCount;

  const step4FilledCount =
    lStatus.steps.pengobatan.filledCount + lStatus.steps.lainnya.filledCount;
  const step4TotalCount =
    lStatus.steps.pengobatan.totalCount + lStatus.steps.lainnya.totalCount;

  return {
    kunjungan: {
      id: 'kunjungan' as UnifiedStepId,
      title: 'Kunjungan',
      filled: step1FilledCount > 0,
      filledCount: step1FilledCount,
      totalCount: step1TotalCount,
    },
    kemandirian: {
      id: 'kemandirian' as UnifiedStepId,
      title: 'Kemandirian',
      filled: step2FilledCount > 0,
      filledCount: step2FilledCount,
      totalCount: step2TotalCount,
    },
    kelainan: {
      id: 'kelainan' as UnifiedStepId,
      title: 'Kelainan',
      filled: step3FilledCount > 0,
      filledCount: step3FilledCount,
      totalCount: step3TotalCount,
    },
    tindak_lanjut: {
      id: 'tindak_lanjut' as UnifiedStepId,
      title: 'Tindak Lanjut',
      filled: step4FilledCount > 0,
      filledCount: step4FilledCount,
      totalCount: step4TotalCount,
    },
  };
}

export function UnifiedFormSteps({
  month,
  kelurahanName,
  step,
  onChangeStep,
  kDraft,
  lDraft,
  kComputed,
  lComputed,
  onChangeKunjungan,
  onChangeLayananNum,
  onChangeLayananText,
  onCopyPosyanduPrevMonth,
  isCopyingPosyandu,
}: UnifiedFormStepsProps) {
  const stepIdx = UNIFIED_STEPS.findIndex((s) => s.id === step);
  const stepStates = getUnifiedStepStates(kDraft, lDraft);
  const activeState = stepStates[step];

  const renderVisitSection = (
    title: string,
    subtitle: string,
    rows: Array<{
      ageLabel: string;
      genderLabel: string;
      field: keyof KunjunganInput;
      lamaVal: number;
    }>,
  ) => (
    <div className="space-y-2.5">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          <div className="col-span-4">Kelompok Umur &amp; JK</div>
          <div className="col-span-3 text-right">Lama (Otomatis)</div>
          <div className="col-span-3 text-right">Lansia Baru</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((item) => {
            const baru = kDraft[item.field] ?? 0;
            const total = item.lamaVal + baru;
            return (
              <div key={item.field} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
                <label
                  htmlFor={`kunj-${item.field}`}
                  className="col-span-4 text-sm font-medium text-slate-800"
                >
                  <span className="block">{item.ageLabel}</span>
                  <span className="text-xs font-normal text-slate-500">{item.genderLabel}</span>
                </label>
                <div className="col-span-3 text-right text-sm font-medium text-slate-500 tabular-nums">
                  {item.lamaVal}
                </div>
                <div className="col-span-3">
                  <NumericInput
                    id={`kunj-${item.field}`}
                    compact
                    value={kDraft[item.field]}
                    onChange={(v) => onChangeKunjungan(item.field, v)}
                    ariaLabel={`${title} ${item.ageLabel} ${item.genderLabel} Lansia Baru`}
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-[#0D7A6F] tabular-nums">
                  {total}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Unified 4-Step Tab Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {UNIFIED_STEPS.map((s) => {
          const active = s.id === step;
          const st = stepStates[s.id];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeStep(s.id)}
              className={`flex items-center justify-between gap-1.5 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                active
                  ? 'border-[#0D7A6F] bg-[#F0FDFA] text-[#0A645B]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    active ? 'bg-[#0D7A6F] text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {s.num}
                </span>
                <span className="whitespace-nowrap">{s.title}</span>
              </span>
              {st.filled ? (
                <CheckCircle2
                  className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                  aria-label="Terisi"
                />
              ) : (
                <span className="shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                  Kosong
                </span>
              )}
            </button>
          );
        })}
      </div>

      {!activeState.filled && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            Bagian <strong>{activeState.title}</strong> untuk <strong>{kelurahanName}</strong>{' '}
            masih kosong (0/{activeState.totalCount} kolom terisi).
          </span>
        </div>
      )}

      {/* Step 1: Kunjungan (Dalam Gedung + Luar Gedung) */}
      {step === 'kunjungan' && (
        <div data-form-grid className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Kunjungan Lansia — {kelurahanName} ({MONTH_TITLES[month - 1]})
            </h3>
            <p className="text-xs text-slate-500">
              Isi jumlah Lansia Baru di Dalam Gedung dan Luar Gedung. Lansia Lama dihitung otomatis
              dari Januari s.d. bulan sebelumnya.
            </p>
          </div>

          {renderVisitSection(
            'A. Dalam Gedung (Puskesmas)',
            'Pasien lansia baru yang dilayani di dalam gedung Puskesmas.',
            [
              { ageLabel: 'Usia 45–59 Th', genderLabel: 'Laki-laki (L)', field: 'dg45_59L', lamaVal: kComputed.dg45_59L_Lama },
              { ageLabel: 'Usia 45–59 Th', genderLabel: 'Perempuan (P)', field: 'dg45_59P', lamaVal: kComputed.dg45_59P_Lama },
              { ageLabel: 'Usia 60–69 Th', genderLabel: 'Laki-laki (L)', field: 'dg60_69L', lamaVal: kComputed.dg60_69L_Lama },
              { ageLabel: 'Usia 60–69 Th', genderLabel: 'Perempuan (P)', field: 'dg60_69P', lamaVal: kComputed.dg60_69P_Lama },
              { ageLabel: 'Usia > 70 Th', genderLabel: 'Laki-laki (L)', field: 'dg70L', lamaVal: kComputed.dg70L_Lama },
              { ageLabel: 'Usia > 70 Th', genderLabel: 'Perempuan (P)', field: 'dg70P', lamaVal: kComputed.dg70P_Lama },
            ],
          )}

          {renderVisitSection(
            'B. Luar Gedung (Posyandu / Poskeskel)',
            'Lansia baru yang dilayani di Posyandu Lansia atau Poskeskel.',
            [
              { ageLabel: 'Usia 45–59 Th', genderLabel: 'Laki-laki (L)', field: 'lg45_59L', lamaVal: kComputed.lg45_59L_Lama },
              { ageLabel: 'Usia 45–59 Th', genderLabel: 'Perempuan (P)', field: 'lg45_59P', lamaVal: kComputed.lg45_59P_Lama },
              { ageLabel: 'Usia 60–69 Th', genderLabel: 'Laki-laki (L)', field: 'lg60_69L', lamaVal: kComputed.lg60_69L_Lama },
              { ageLabel: 'Usia 60–69 Th', genderLabel: 'Perempuan (P)', field: 'lg60_69P', lamaVal: kComputed.lg60_69P_Lama },
              { ageLabel: 'Usia > 70 Th', genderLabel: 'Laki-laki (L)', field: 'lg70L', lamaVal: kComputed.lg70L_Lama },
              { ageLabel: 'Usia > 70 Th', genderLabel: 'Perempuan (P)', field: 'lg70P', lamaVal: kComputed.lg70P_Lama },
            ],
          )}

          <p className="text-xs text-slate-500">
            Tip: Tekan{' '}
            <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[11px]">
              Enter
            </kbd>{' '}
            setelah mengetik angka untuk langsung pindah ke kotak berikutnya.
          </p>
        </div>
      )}

      {/* Step 2: Kemandirian (ADL) + Posyandu & JKN */}
      {step === 'kemandirian' && (
        <div data-form-grid className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Kemandirian (ADL) &amp; Posyandu — {kelurahanName}
            </h3>
            <p className="text-xs text-slate-500">
              A = Mandiri • B = Ketergantungan Sedang • C = Ketergantungan Berat.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Usia 60–69 Tahun</h4>
              <div className="space-y-3">
                {[
                  { field: 'kem60_69A' as const, label: 'Tingkat A (Mandiri)' },
                  { field: 'kem60_69B' as const, label: 'Tingkat B (Sedang)' },
                  { field: 'kem60_69C' as const, label: 'Tingkat C (Berat)' },
                ].map((item) => (
                  <div key={item.field} className="flex items-center justify-between gap-3">
                    <label htmlFor={`kunj-${item.field}`} className="text-sm text-slate-700">
                      {item.label}
                    </label>
                    <div className="w-28">
                      <NumericInput
                        id={`kunj-${item.field}`}
                        compact
                        value={kDraft[item.field]}
                        onChange={(v) => onChangeKunjungan(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Usia &gt; 70 Tahun</h4>
              <div className="space-y-3">
                {[
                  { field: 'kem70A' as const, label: 'Tingkat A (Mandiri)' },
                  { field: 'kem70B' as const, label: 'Tingkat B (Sedang)' },
                  { field: 'kem70C' as const, label: 'Tingkat C (Berat)' },
                ].map((item) => (
                  <div key={item.field} className="flex items-center justify-between gap-3">
                    <label htmlFor={`kunj-${item.field}`} className="text-sm text-slate-700">
                      {item.label}
                    </label>
                    <div className="w-28">
                      <NumericInput
                        id={`kunj-${item.field}`}
                        compact
                        value={kDraft[item.field]}
                        onChange={(v) => onChangeKunjungan(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Posyandu, Kader &amp; Kepemilikan JKN
                </h4>
                <p className="text-xs text-slate-500">
                  Angka ini biasanya tetap tiap bulan; salin dari bulan lalu bila sama.
                </p>
              </div>
              {month > 1 && (
                <button
                  type="button"
                  onClick={onCopyPosyanduPrevMonth}
                  disabled={isCopyingPosyandu}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#0D7A6F] bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#0A645B] hover:bg-teal-100/70 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Salin dari {MONTH_TITLES[month - 2]}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { field: 'jmlPosyandu' as const, label: 'Jumlah Posyandu Lansia' },
                { field: 'pemberdayaanLansia' as const, label: 'Pemberdayaan Lansia' },
                { field: 'posyanduPtm' as const, label: 'Posyandu Terintegrasi PTM' },
                { field: 'jmlKader' as const, label: 'Jumlah Kader Lansia' },
                { field: 'kaderTerlatih' as const, label: 'Kader Terlatih Kesehatan Lansia' },
                { field: 'jmlJkn' as const, label: 'Jumlah Lansia Memiliki JKN' },
              ].map((item) => (
                <div
                  key={item.field}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-2"
                >
                  <label htmlFor={`kunj-${item.field}`} className="text-sm text-slate-700">
                    {item.label}
                  </label>
                  <div className="w-24 shrink-0">
                    <NumericInput
                      id={`kunj-${item.field}`}
                      compact
                      value={kDraft[item.field]}
                      onChange={(v) => onChangeKunjungan(item.field, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Kelainan Lansia (14 Jenis) */}
      {step === 'kelainan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Layanan Lansia dengan Kelainan — {kelurahanName}
              </h3>
              <p className="text-xs text-slate-500">
                Total Laki-laki (AL) dan Perempuan (AM) dihitung otomatis secara akurat.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#0A645B] tabular-nums">
              <span>L: {lComputed.kelainanL}</span>
              <span>•</span>
              <span>P: {lComputed.kelainanP}</span>
              <span>•</span>
              <span>Total: {lComputed.kelainanTotal}</span>
            </div>
          </div>

          <div data-form-grid className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <div className="col-span-6">Jenis Kelainan</div>
              <div className="col-span-3 text-right">Laki-laki (L)</div>
              <div className="col-span-3 text-right">Perempuan (P)</div>
            </div>

            <div className="divide-y divide-slate-100">
              {KELAINAN_DEFINITIONS.map((def) => (
                <div key={def.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2">
                  <div className="col-span-6 text-sm font-medium text-slate-800">{def.label}</div>
                  <div className="col-span-3">
                    <NumericInput
                      id={`lay-${def.lKey}`}
                      compact
                      ariaLabel={`${def.label} Laki-laki`}
                      value={lDraft[def.lKey] as number | null}
                      onChange={(v) => onChangeLayananNum(def.lKey, v)}
                    />
                  </div>
                  <div className="col-span-3">
                    <NumericInput
                      id={`lay-${def.pKey}`}
                      compact
                      ariaLabel={`${def.label} Perempuan`}
                      value={lDraft[def.pKey] as number | null}
                      onChange={(v) => onChangeLayananNum(def.pKey, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Tindak Lanjut (Pengobatan, Konseling, Penyuluhan & Lainnya) */}
      {step === 'tindak_lanjut' && (
        <div data-form-grid className="space-y-5">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Pengobatan, Konseling &amp; Penyuluhan — {kelurahanName}
            </h3>
            <p className="text-xs text-slate-500">
              Lengkapi data tindak lanjut pengobatan, konseling, penyuluhan, dan kegiatan lansia.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Pengobatan</h4>
              <div className="space-y-3">
                {[
                  { field: 'diedukasi' as const, label: 'Diedukasi' },
                  { field: 'diobati' as const, label: 'Diobati' },
                  { field: 'dirujuk' as const, label: 'Dirujuk' },
                ].map((item) => (
                  <div key={item.field} className="flex items-center justify-between gap-3">
                    <label htmlFor={`lay-${item.field}`} className="text-sm text-slate-700">
                      {item.label}
                    </label>
                    <div className="w-28">
                      <NumericInput
                        id={`lay-${item.field}`}
                        compact
                        value={lDraft[item.field]}
                        onChange={(v) => onChangeLayananNum(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Konseling</h4>
              <div className="space-y-3">
                {[
                  { field: 'konselingBaru' as const, label: 'Konseling Baru' },
                  { field: 'konselingLama' as const, label: 'Konseling Lama' },
                  { field: 'konselingSelesai' as const, label: 'Konseling Selesai' },
                ].map((item) => (
                  <div key={item.field} className="flex items-center justify-between gap-3">
                    <label htmlFor={`lay-${item.field}`} className="text-sm text-slate-700">
                      {item.label}
                    </label>
                    <div className="w-28">
                      <NumericInput
                        id={`lay-${item.field}`}
                        compact
                        value={lDraft[item.field]}
                        onChange={(v) => onChangeLayananNum(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { field: 'penyuluhan' as const, label: 'Penyuluhan' },
              { field: 'aktifBekerja' as const, label: 'Jumlah Lansia Aktif Bekerja' },
              { field: 'pantiWredha' as const, label: 'Jumlah Panti Wredha Dibina' },
              { field: 'homecare' as const, label: 'Jumlah Kunjungan Rumah (Homecare)' },
            ].map((item) => (
              <div
                key={item.field}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5"
              >
                <label htmlFor={`lay-${item.field}`} className="text-sm text-slate-700">
                  {item.label}
                </label>
                <div className="w-24 shrink-0">
                  <NumericInput
                    id={`lay-${item.field}`}
                    compact
                    value={lDraft[item.field]}
                    onChange={(v) => onChangeLayananNum(item.field, v)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="lay-keterangan" className="mb-1.5 block text-sm font-medium text-slate-700">
              Keterangan (Opsional)
            </label>
            <textarea
              id="lay-keterangan"
              rows={2}
              value={lDraft.keterangan}
              onChange={(e) => onChangeLayananText(e.target.value)}
              placeholder="Catatan tambahan kelurahan bila ada..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20"
            />
          </div>
        </div>
      )}

      {/* Step Navigation Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={stepIdx === 0}
          onClick={() => onChangeStep(UNIFIED_STEPS[stepIdx - 1].id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:invisible"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sebelumnya</span>
        </button>

        {stepIdx < UNIFIED_STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => onChangeStep(UNIFIED_STEPS[stepIdx + 1].id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <span>Lanjut: {UNIFIED_STEPS[stepIdx + 1].title}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
