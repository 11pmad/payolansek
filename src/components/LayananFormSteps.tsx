import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { LayananComputed, LayananInput } from '../../shared/types.js';
import { KELAINAN_DEFINITIONS } from '../../shared/calculations.js';
import { NumericInput } from './NumericInput.js';

export type LayananStepId = 'kelainan' | 'pengobatan' | 'lainnya';

interface LayananFormStepsProps {
  kelurahanName: string;
  step: LayananStepId;
  onChangeStep: (step: LayananStepId) => void;
  draft: LayananInput;
  computed: LayananComputed;
  onChangeNum: (field: keyof LayananInput, value: number | null) => void;
  onChangeText: (value: string) => void;
}

const STEPS: Array<{ id: LayananStepId; num: string; title: string }> = [
  { id: 'kelainan', num: '1', title: 'Kelainan Lansia (14 Jenis)' },
  { id: 'pengobatan', num: '2', title: 'Pengobatan & Konseling' },
  { id: 'lainnya', num: '3', title: 'Penyuluhan & Lainnya' },
];

export function LayananFormSteps({
  kelurahanName,
  step,
  onChangeStep,
  draft,
  computed,
  onChangeNum,
  onChangeText,
}: LayananFormStepsProps) {
  const stepIdx = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="space-y-5">
      {/* Sub-step Tabs */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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

      {step === 'kelainan' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Jumlah Layanan Lansia dengan Kelainan — {kelurahanName}
              </h3>
              <p className="text-xs text-slate-500">
                Total Laki-laki (AL) dan Perempuan (AM) dihitung otomatis secara akurat.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-[#F0FDFA] px-3 py-1.5 text-xs font-semibold text-[#0A645B] tabular-nums">
              <span>L: {computed.kelainanL}</span>
              <span>•</span>
              <span>P: {computed.kelainanP}</span>
              <span>•</span>
              <span>Total: {computed.kelainanTotal}</span>
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
                <div
                  key={def.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2"
                >
                  <div className="col-span-6 text-sm font-medium text-slate-800">{def.label}</div>
                  <div className="col-span-3">
                    <NumericInput
                      id={`lay-${def.lKey}`}
                      compact
                      ariaLabel={`${def.label} Laki-laki`}
                      value={draft[def.lKey] as number | null}
                      onChange={(v) => onChangeNum(def.lKey, v)}
                    />
                  </div>
                  <div className="col-span-3">
                    <NumericInput
                      id={`lay-${def.pKey}`}
                      compact
                      ariaLabel={`${def.label} Perempuan`}
                      value={draft[def.pKey] as number | null}
                      onChange={(v) => onChangeNum(def.pKey, v)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'pengobatan' && (
        <div data-form-grid className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Pengobatan &amp; Konseling — {kelurahanName}
            </h3>
            <p className="text-xs text-slate-500">
              Masukkan jumlah lansia yang mendapat tindakan pengobatan dan layanan konseling.
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
                        value={draft[item.field]}
                        onChange={(v) => onChangeNum(item.field, v)}
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
                        value={draft[item.field]}
                        onChange={(v) => onChangeNum(item.field, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'lainnya' && (
        <div data-form-grid className="space-y-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Penyuluhan, Aktivitas &amp; Keterangan — {kelurahanName}
            </h3>
            <p className="text-xs text-slate-500">
              Lengkapi data penyuluhan, lansia aktif bekerja, pembinaan panti, dan kunjungan rumah.
            </p>
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
                    value={draft[item.field]}
                    onChange={(v) => onChangeNum(item.field, v)}
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
              value={draft.keterangan}
              onChange={(e) => onChangeText(e.target.value)}
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
