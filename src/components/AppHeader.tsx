import { useRef } from 'react';
import {
  BarChart3,
  ClipboardEdit,
  Download,
  FileSpreadsheet,
  Settings,
  Table2,
  Upload,
} from 'lucide-react';
import type { YearSummary } from '../../shared/types.js';

export type NavTab = 'dashboard' | 'input' | 'table' | 'settings';

interface AppHeaderProps {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  years: YearSummary[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
  puskesmas: string;
  kota: string;
  onImportFile: (file: File) => void;
  onExportExcel: () => void;
  isImporting: boolean;
}

const NAV_ITEMS: Array<{ id: NavTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Ringkasan', icon: BarChart3 },
  { id: 'input', label: 'Input Laporan', icon: ClipboardEdit },
  { id: 'table', label: 'Pratinjau Tabel', icon: Table2 },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export function AppHeader({
  activeTab,
  onChangeTab,
  years,
  selectedYear,
  onSelectYear,
  puskesmas,
  kota,
  onImportFile,
  onExportExcel,
  isImporting,
}: AppHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D7A6F] text-white">
              <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight text-slate-900 sm:text-lg">
                SIMLANSIA {puskesmas}
              </h1>
              <p className="text-xs text-slate-500">
                Puskesmas {puskesmas} • Dinas Kesehatan Kota {kota}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="year-select" className="sr-only">
              Tahun Laporan
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => onSelectYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20"
            >
              {years.map((y) => (
                <option key={y.year} value={y.year}>
                  Tahun {y.year}
                </option>
              ))}
            </select>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              aria-label="Pilih file Excel untuk diimport"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImportFile(file);
                e.currentTarget.value = '';
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/30 disabled:opacity-50"
            >
              <Upload className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>{isImporting ? 'Mengimpor...' : 'Import Excel'}</span>
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A645B] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/40"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Export Excel Resmi</span>
            </button>
          </div>
        </div>

        <nav aria-label="Menu utama" className="-mb-px flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                  active
                    ? 'border-[#0D7A6F] text-[#0D7A6F]'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
