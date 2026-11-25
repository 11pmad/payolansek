import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  ClipboardEdit,
  Download,
  FileSpreadsheet,
  LogOut,
  Menu,
  Settings,
  Table2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { KELURAHAN_LIST, type AuthUser, type YearSummary } from '../../shared/types.js';
import { TAB_TITLES, TAB_TO_PATH, type NavTab } from '../routes.js';

export type { NavTab };

interface AppHeaderProps {
  user: AuthUser;
  onLogout: () => void;
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
  { id: 'analytics', label: 'Analisis', icon: TrendingUp },
  { id: 'input', label: 'Input Laporan', icon: ClipboardEdit },
  { id: 'table', label: 'Pratinjau Tabel', icon: Table2 },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export function AppHeader({
  user,
  onLogout,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleLabel =
    user.role === 'admin'
      ? 'Admin Puskesmas'
      : user.kelurahanIdx !== null
        ? `Petugas • ${KELURAHAN_LIST[user.kelurahanIdx]?.name ?? ''}`
        : 'Petugas Puskesmas';

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <>
      {user.role === 'admin' && (
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
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Minimalist Mobile Top Bar */}
          <div className="flex items-center justify-between gap-2 py-2.5 md:hidden">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                aria-label="Buka menu navigasi"
                aria-expanded={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/30"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0D7A6F] text-white">
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-bold leading-tight text-slate-900">
                  SIMLANSIA {puskesmas}
                </h1>
                <p className="truncate text-[11px] font-medium text-[#0D7A6F]">
                  {TAB_TITLES[activeTab]}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 tabular-nums">
                {selectedYear}
              </span>
              <button
                type="button"
                aria-label="Export Excel Resmi"
                onClick={onExportExcel}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0D7A6F] text-white hover:bg-[#0A645B] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/40"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Desktop Header & Horizontal Nav */}
          <div className="hidden md:block">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0D7A6F] text-white">
                  <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-bold leading-tight text-slate-900">
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

                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/30 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>{isImporting ? 'Mengimpor...' : 'Import Excel'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onExportExcel}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D7A6F] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0A645B] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/40"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Export Excel Resmi</span>
                </button>

                <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-800">{user.fullName}</p>
                    <p className="text-[11px] text-slate-500">{roleLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Keluar dari akun"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/30"
                  >
                    <LogOut className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </div>

            <nav aria-label="Menu utama" className="-mb-px flex gap-1 overflow-x-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                const href = TAB_TO_PATH[item.id];
                return (
                  <a
                    key={item.id}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    onClick={(e) => {
                      if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                        e.preventDefault();
                        onChangeTab(item.id);
                      }
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                      active
                        ? 'border-[#0D7A6F] text-[#0D7A6F]'
                        : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Sidebar Drawer */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu navigasi mobile"
        >
          <div
            className="fixed inset-0 bg-slate-900/40"
            aria-hidden="true"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col justify-between bg-white shadow-xl">
            <div className="flex flex-col overflow-y-auto p-4">
              {/* Drawer Brand + Close */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0D7A6F] text-white">
                    <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">SIMLANSIA</p>
                    <p className="text-[11px] text-slate-500">Puskesmas {puskesmas}</p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Tutup menu"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* User Profile + Year */}
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-900">{user.fullName}</p>
                <p className="text-[11px] text-slate-500">{roleLabel}</p>
                <div className="mt-2.5">
                  <label htmlFor="mobile-year-select" className="mb-1 block text-[11px] font-medium text-slate-500">
                    Tahun Laporan
                  </label>
                  <select
                    id="mobile-year-select"
                    value={selectedYear}
                    onChange={(e) => {
                      onSelectYear(Number(e.target.value));
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#0D7A6F] focus:outline-none"
                  >
                    {years.map((y) => (
                      <option key={y.year} value={y.year}>
                        Tahun {y.year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vertical Nav */}
              <nav aria-label="Navigasi sidebar" className="mt-4 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  const href = TAB_TO_PATH[item.id];
                  return (
                    <a
                      key={item.id}
                      href={href}
                      aria-current={active ? 'page' : undefined}
                      onClick={(e) => {
                        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
                          e.preventDefault();
                          onChangeTab(item.id);
                          setIsMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#F0FDFA] text-[#0D7A6F]'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </nav>

              {/* Excel Actions */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onExportExcel();
                    setIsMobileMenuOpen(false);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D7A6F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0A645B]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>Export Excel Resmi</span>
                </button>

                {user.role === 'admin' && (
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <span>{isImporting ? 'Mengimpor...' : 'Import Excel'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Footer: Logout */}
            <div className="border-t border-slate-100 p-4">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Keluar</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
