import { ArrowLeft, ArrowRight, Copy } from 'lucide-react';
import {
  MONTH_TITLES,
  type KunjunganComputed,
  type KunjunganInput,
} from '../../shared/types.js';
import { NumericInput } from './NumericInput.js';

export type KunjunganStepId = 'dalam' | 'luar' | 'kemandirian' | 'posyandu';

interface KunjunganFormStepsProps {
  month: number;
  kelurahanName: string;
  step: KunjunganStepId;
  onChangeStep: (step: KunjunganStepId) => void;
  draft: KunjunganInput;
  computed: KunjunganComputed;
  onChangeField: (field: keyof KunjunganInput, value: number | null) => void;
  onCopyPosyanduPrevMonth: () => void;
  isCopyingPosyandu: boolean;
}

const STEPS: Array<{ id: KunjunganStepId; num: string; title: string }> = [
  { id: 'dalam', num: '1', title: 'Dalam Gedung' },
  { id: 'luar', num: '2', title: 'Luar Gedung' },
  { id: 'kemandirian', num: '3', title: 'Kemandirian' },
  { id: 'posyandu', num: '4', title: 'Posyandu & JKN' },
];

export function KunjunganFormSteps({
  month,
  kelurahanName,
  step,
  onChangeStep,
  draft,
  computed,
  onChangeField,
  onCopyPosyanduPrevMonth,
  isCopyingPosyandu,
}: KunjunganFormStepsProps) {
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  const renderVisitGrid = (
    title: string,
    subtitle: string,
    rows: Array<{
      ageLabel: string;
      genderLabel: string;
      field: keyof KunjunganInput;
      lamaVal: number;
    }>,
  ) => (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div data-form-grid className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
          <div className="col-span-4 sm:col-span-4">Kelompok Umur &amp; JK</div>
          <div className="col-span-3 text-right">Lama (Otomatis)</div>
          <div className="col-span-3 text-right">Lansia Baru</div>
          <div className="col-span-2 text-right">Total</div>
        </div>

        <div className="divide-y divide-slate-100">
          {rows.map((item) => {
            const baru = draft[item.field] ?? 0;
            const total = item.lamaVal + baru;
            return (
              <div
                key={item.field}
                className="grid grid-cols-12 items-center gap-2 px-3 py-2.5"
              >
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
                    value={draft[item.field]}
                    onChange={(v) => onChangeField(item.field, v)}
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

      <p className="text-xs text-slate-500">
        Tip: Tekan <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[11px]">Enter</kbd>{' '}
        setelah mengetik angka untuk langsung pindah ke kotak berikutnya.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Sub-step Tabs */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s) => {
          const active = s.id === step;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onChangeStep(s.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                active
                  ? 'border-[#0D7A6F] bg-[#F0FDFA] text-[#0A645B]'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  active ? 'bg-[#0D7A6F] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {s.num}
              </span>
              <span className="truncate">{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Active Step Body */}
      {step === 'dalam' &&
        renderVisitGrid(
          `Kunjungan Dalam Gedung (Puskesmas) — ${kelurahanName}`,
          `Isi jumlah Lansia Baru bulan ${MONTH_TITLES[month - 1]}. Kolom Lansia Lama otomatis menjumlahkan bulan Januari s.d. bulan sebelumnya.`,
          [
            { ageLabel: 'Usia 45–59 Th', genderLabel: 'Laki-laki (L)', field: 'dg45_59L', lamaVal: computed.dg45_59L_Lama },
            { ageLabel: 'Usia 45–59 Th', genderLabel: 'Perempuan (P)', field: 'dg45_59P', lamaVal: computed.dg45_59P_Lama },
            { ageLabel: 'Usia 60–69 Th', genderLabel: 'Laki-laki (L)', field: 'dg60_69L', lamaVal: computed.dg60_69L_Lama },
            { ageLabel: 'Usia 60–69 Th', genderLabel: 'Perempuan (P)', field: 'dg60_69P', lamaVal: computed.dg60_69P_Lama },
            { ageLabel: 'Usia > 70 Th', genderLabel: 'Laki-laki (L)', field: 'dg70L', lamaVal: computed.dg70L_Lama },
            { ageLabel: 'Usia > 70 Th', genderLabel: 'Perempuan (P)', field: 'dg70P', lamaVal: computed.dg70P_Lama },
          ],
        )}

      {step === 'luar' &&
        renderVisitGrid(
          `Kunjungan Luar Gedung (Posyandu / Poskeskel) — ${kelurahanName}`,
          `Isi jumlah Lansia Baru yang berkunjung di Posyandu/Poskeskel pada bulan ${MONTH_TITLES[month - 1]}.`,
          [
            { ageLabel: 'Usia 45–59 Th', genderLabel: 'Laki-laki (L)', field: 'lg45_59L', lamaVal: computed.lg45_59L_Lama },
            { ageLabel: 'Usia 45–59 Th', genderLabel: 'Perempuan (P)', field: 'lg45_59P', lamaVal: computed.lg45_59P_Lama },
            { ageLabel: 'Usia 60–69 Th', genderLabel: 'Laki-laki (L)', field: 'lg60_69L', lamaVal: computed.lg60_69L_Lama },
            { ageLabel: 'Usia 60–69 Th', genderLabel: 'Perempuan (P)', field: 'lg60_69P', lamaVal: computed.lg60_69P_Lama },
            { ageLabel: 'Usia > 70 Th', genderLabel: 'Laki-laki (L)', field: 'lg70L', lamaVal: computed.lg70L_Lama },
            { ageLabel: 'Usia > 70 Th', genderLabel: 'Perempuan (P)', field: 'lg70P', lamaVal: computed.lg70P_Lama },
          ],
        )}

      {step === 'kemandirian' && (
        <div data-form-grid className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Tingkat Kemandirian (ADL) — {kelurahanName}
            </h3>
            <p className="text-xs text-slate-500">
              A = Mandiri • B = Ketergantungan Ringan/Sedang • C = Ketergantungan Berat/Total.
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
                        value={draft[item.field]}
                        onChange={(v) => onChangeField(item.field, v)}
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
                        value={draft[item.field]}
                        onChange={(v) => onChangeField(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'posyandu' && (
        <div data-form-grid className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Posyandu, Kader &amp; Kepemilikan JKN — {kelurahanName}
              </h3>
              <p className="text-xs text-slate-500">
                Angka ini biasanya tetap tiap bulan; gunakan tombol salin jika sama dengan bulan lalu.
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
              { field: 'posyanduPtm' as const, label: 'Posyandu Terintegrasi dgn PTM' },
              { field: 'jmlKader' as const, label: 'Jumlah Kader Lansia' },
              { field: 'kaderTerlatih' as const, label: 'Kader Mendapat Pelatihan/Orientasi' },
              { field: 'jmlJkn' as const, label: 'Jumlah Lansia Memiliki JKN' },
            ].map((item) => (
              <div
                key={item.field}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3.5 py-2.5"
              >
                <label htmlFor={`kunj-${item.field}`} className="text-sm text-slate-700">
                  {item.label}
                </label>
                <div className="w-24 shrink-0">
                  <NumericInput
                    id={`kunj-${item.field}`}
                    compact
                    value={draft[item.field]}
                    onChange={(v) => onChangeField(item.field, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step Navigation Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <button
          type="button"
          disabled={stepIdx === 0}
          onClick={() => onChangeStep(STEPS[stepIdx - 1].id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:invisible"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Sebelumnya</span>
        </button>

        {stepIdx < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => onChangeStep(STEPS[stepIdx + 1].id)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <span>Lanjut: {STEPS[stepIdx + 1].title}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
