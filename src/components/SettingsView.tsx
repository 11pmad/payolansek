import { useState } from 'react';
import { Check, Plus, Save } from 'lucide-react';
import {
  KELURAHAN_LIST,
  type KunjunganInput,
  type LayananInput,
  type YearReportData,
} from '../../shared/types.js';
import { n } from '../../shared/calculations.js';
import { NumericInput } from './NumericInput.js';

interface SettingsViewProps {
  report: YearReportData;
  onSaveSettings: (payload: {
    puskesmas: string;
    kota: string;
    sasaranKunjungan: Array<
      Pick<KunjunganInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>
    >;
    sasaranLayanan: Array<
      Pick<LayananInput, 'sas45_59L' | 'sas45_59P' | 'sas60_69L' | 'sas60_69P' | 'sas70L' | 'sas70P'>
    >;
  }) => Promise<void>;
  onCreateYear: (year: number, copyFromYear?: number) => Promise<void>;
}

export function SettingsView({ report, onSaveSettings, onCreateYear }: SettingsViewProps) {
  const [puskesmas, setPuskesmas] = useState(report.puskesmas);
  const [kota, setKota] = useState(report.kota);
  const [sasTab, setSasTab] = useState<'kunjungan' | 'layanan'>('kunjungan');

  const [sasKunjungan, setSasKunjungan] = useState(() =>
    KELURAHAN_LIST.map((_, idx) => {
      const r = report.kunjungan[1][idx];
      return {
        sas45_59L: r.sas45_59L,
        sas45_59P: r.sas45_59P,
        sas60_69L: r.sas60_69L,
        sas60_69P: r.sas60_69P,
        sas70L: r.sas70L,
        sas70P: r.sas70P,
      };
    }),
  );

  const [sasLayanan, setSasLayanan] = useState(() =>
    KELURAHAN_LIST.map((_, idx) => {
      const r = report.layanan[1][idx];
      return {
        sas45_59L: r.sas45_59L,
        sas45_59P: r.sas45_59P,
        sas60_69L: r.sas60_69L,
        sas60_69P: r.sas60_69P,
        sas70L: r.sas70L,
        sas70P: r.sas70P,
      };
    }),
  );

  const [newYear, setNewYear] = useState(report.year + 1);
  const [copySasaran, setCopySasaran] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const activeRows = sasTab === 'kunjungan' ? sasKunjungan : sasLayanan;
  const setActiveRows = sasTab === 'kunjungan' ? setSasKunjungan : setSasLayanan;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        puskesmas,
        kota,
        sasaranKunjungan: sasKunjungan,
        sasaranLayanan: sasLayanan,
      });
      setNotice(`Pengaturan & Sasaran tahun ${report.year} diterapkan ke seluruh 12 bulan.`);
      window.setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreateYear(newYear, copySasaran ? report.year : undefined);
      setNotice(`Tahun laporan ${newYear} berhasil dibuat.`);
      window.setTimeout(() => setNotice(null), 4000);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* Identitas Puskesmas */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Identitas Puskesmas</h2>
        <p className="mb-4 text-xs text-slate-500">
          Ditampilkan pada header seluruh halaman laporan Excel resmi.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="cfg-puskesmas" className="mb-1 block text-xs font-semibold text-slate-700">
              Nama Puskesmas
            </label>
            <input
              id="cfg-puskesmas"
              type="text"
              value={puskesmas}
              onChange={(e) => setPuskesmas(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="cfg-kota" className="mb-1 block text-xs font-semibold text-slate-700">
              Kota / Kabupaten
            </label>
            <input
              id="cfg-kota"
              type="text"
              value={kota}
              onChange={(e) => setKota(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Sasaran Lansia Tahunan */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Sasaran Lansia Tahun {report.year}
            </h2>
            <p className="text-xs text-slate-500">
              Sasaran pada Lap. Kunjungan dan Lap. Layanan Lansia disimpan terpisah sesuai template.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setSasTab('kunjungan')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                sasTab === 'kunjungan' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Sasaran Lap. Kunjungan
            </button>
            <button
              type="button"
              onClick={() => setSasTab('layanan')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                sasTab === 'layanan' ? 'bg-white text-[#0D7A6F] shadow-xs' : 'text-slate-600'
              }`}
            >
              Sasaran Lap. Layanan
            </button>
          </div>
        </div>

        <div data-form-grid className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Kelurahan</th>
                <th className="px-2 py-2.5 text-right font-semibold">45–59 L</th>
                <th className="px-2 py-2.5 text-right font-semibold">45–59 P</th>
                <th className="px-2 py-2.5 text-right font-semibold">60–69 L</th>
                <th className="px-2 py-2.5 text-right font-semibold">60–69 P</th>
                <th className="px-2 py-2.5 text-right font-semibold">&gt;70 L</th>
                <th className="px-2 py-2.5 text-right font-semibold">&gt;70 P</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total &gt;60 Th</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {KELURAHAN_LIST.map((kel, idx) => {
                const row = activeRows[idx];
                const tot60 =
                  n(row.sas60_69L) + n(row.sas60_69P) + n(row.sas70L) + n(row.sas70P);
                const updateField = (
                  field: keyof typeof row,
                  val: number | null,
                ) => {
                  setActiveRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
                  );
                };

                return (
                  <tr key={kel.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{kel.name}</td>
                    {(['sas45_59L', 'sas45_59P', 'sas60_69L', 'sas60_69P', 'sas70L', 'sas70P'] as const).map(
                      (f) => (
                        <td key={f} className="px-1.5 py-2">
                          <NumericInput
                            id={`sas-${sasTab}-${idx}-${f}`}
                            compact
                            value={row[f]}
                            onChange={(v) => updateField(f, v)}
                          />
                        </td>
                      ),
                    )}
                    <td className="px-3 py-2 text-right font-bold text-[#0D7A6F] tabular-nums">
                      {tot60}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A645B] disabled:opacity-50"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan & Terapkan ke Semua 12 Bulan'}</span>
          </button>
        </div>
      </section>

      {/* Buat Tahun Laporan Baru */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">Buat Tahun Laporan Baru</h2>
        <p className="mb-4 text-xs text-slate-500">
          Siapkan buku laporan tahun berikutnya (misal {report.year + 1}) beserta daftar sasaran.
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="new-year-input" className="sr-only">
              Tahun Baru
            </label>
            <input
              id="new-year-input"
              type="number"
              min={2020}
              max={2099}
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
              className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900 tabular-nums"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={copySasaran}
              onChange={(e) => setCopySasaran(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0D7A6F]"
            />
            <span>Salin Sasaran, Posyandu &amp; JKN dari tahun {report.year}</span>
          </label>

          <button
            type="button"
            disabled={isCreating}
            onClick={() => void handleCreate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4 text-[#0D7A6F]" aria-hidden="true" />
            <span>{isCreating ? 'Membuat...' : `Buat Tahun ${newYear}`}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
