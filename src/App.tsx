import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type {
  AuthUser,
  KunjunganInput,
  LayananInput,
  YearReportData,
  YearSummary,
} from '../shared/types.js';
import { computeMonthLayanan, computeYearKunjungan } from '../shared/calculations.js';
import {
  ApiError,
  copyPosyanduFromPrevMonth,
  createYear,
  fetchCurrentUser,
  fetchReport,
  fetchYears,
  getExportUrl,
  importExcelFile,
  logout,
  saveKunjungan,
  saveLayanan,
  saveSettings,
} from './api.js';
import { AppHeader, type NavTab } from './components/AppHeader.js';
import { AnalyticsView } from './components/AnalyticsView.js';
import { DashboardView } from './components/DashboardView.js';
import { InputWorkspace } from './components/InputWorkspace.js';
import { LoginView } from './components/LoginView.js';
import { TablePreviewView } from './components/TablePreviewView.js';
import { SettingsView } from './components/SettingsView.js';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [years, setYears] = useState<YearSummary[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [report, setReport] = useState<YearReportData | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedMonth, setSelectedMonth] = useState<number>(10);
  const [selectedKelurahan, setSelectedKelurahan] = useState<number>(0);
  const [selectedSheet, setSelectedSheet] = useState<'kunjungan' | 'layanan'>('kunjungan');

  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setToast({ type, text });
    window.setTimeout(() => setToast(null), 4500);
  };

  const handleApiError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && err.status === 401) {
      setUser(null);
      setReport(null);
      return;
    }
    showToast('err', err instanceof Error ? err.message : fallback);
  };

  const loadYearData = async (yearToLoad: number, pickLatestMonth = false) => {
    setIsLoading(true);
    try {
      const [yrs, rep] = await Promise.all([fetchYears(), fetchReport(yearToLoad)]);
      setYears(yrs);
      setReport(rep);
      setSelectedYear(rep.year);

      if (pickLatestMonth) {
        const computed = computeYearKunjungan(rep.kunjungan);
        let latest = 1;
        for (let m = 1; m <= 12; m++) {
          if (computed[m].filledCount > 0) latest = m;
        }
        setSelectedMonth(latest);
      }
    } catch (err) {
      handleApiError(err, 'Gagal memuat data.');
    } finally {
      setIsLoading(false);
    }
  };

  const bootstrapForUser = async (authedUser: AuthUser) => {
    setUser(authedUser);
    setSelectedKelurahan(authedUser.kelurahanIdx ?? 0);
    setActiveTab('dashboard');
    setIsLoading(true);
    try {
      const yrs = await fetchYears();
      setYears(yrs);
      const firstYear = yrs[0]?.year ?? 2026;
      await loadYearData(firstYear, true);
    } catch (err) {
      handleApiError(err, 'Gagal terhubung ke server.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const currentUser = await fetchCurrentUser();
        if (currentUser) {
          await bootstrapForUser(currentUser);
        }
      } catch {
        // leave unauthenticated so LoginView renders
      } finally {
        setIsCheckingAuth(false);
      }
    })();
  }, []);

  const kunjunganYear = useMemo(
    () => (report ? computeYearKunjungan(report.kunjungan) : {}),
    [report],
  );

  const layananYear = useMemo(() => {
    if (!report) return {};
    const out: Record<number, ReturnType<typeof computeMonthLayanan>> = {};
    for (let m = 1; m <= 12; m++) {
      out[m] = computeMonthLayanan(m, report.layanan[m] ?? []);
    }
    return out;
  }, [report]);

  const handleSaveKunjungan = async (
    month: number,
    kelurahanIdx: number,
    data: KunjunganInput,
  ) => {
    if (!report) return;
    try {
      await saveKunjungan(report.year, month, kelurahanIdx, data);
      setReport((prev) => {
        if (!prev) return prev;
        const nextMonth = [...prev.kunjungan[month]];
        nextMonth[kelurahanIdx] = data;
        return {
          ...prev,
          kunjungan: { ...prev.kunjungan, [month]: nextMonth },
        };
      });
    } catch (err) {
      handleApiError(err, 'Gagal menyimpan data kunjungan.');
      throw err;
    }
  };

  const handleSaveLayanan = async (
    month: number,
    kelurahanIdx: number,
    data: LayananInput,
  ) => {
    if (!report) return;
    try {
      await saveLayanan(report.year, month, kelurahanIdx, data);
      setReport((prev) => {
        if (!prev) return prev;
        const nextMonth = [...prev.layanan[month]];
        nextMonth[kelurahanIdx] = data;
        return {
          ...prev,
          layanan: { ...prev.layanan, [month]: nextMonth },
        };
      });
    } catch (err) {
      handleApiError(err, 'Gagal menyimpan data layanan.');
      throw err;
    }
  };

  const handleCopyPosyandu = async (targetMonth: number, kelurahanIdx: number) => {
    if (!report || targetMonth <= 1) return;
    try {
      const updated = await copyPosyanduFromPrevMonth(
        report.year,
        targetMonth,
        targetMonth - 1,
        kelurahanIdx,
      );
      setReport(updated);
    } catch (err) {
      handleApiError(err, 'Gagal menyalin data bulan sebelumnya.');
      throw err;
    }
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    try {
      const updated = await importExcelFile(selectedYear, file);
      setReport(updated);
      setYears(await fetchYears());
      showToast('ok', `Berhasil mengimpor "${file.name}" ke Tahun ${selectedYear}.`);
    } catch (err) {
      handleApiError(err, 'Gagal mengimpor file Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = () => {
    window.location.href = getExportUrl(selectedYear);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setReport(null);
      setToast(null);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAF9] text-sm text-slate-500">
        Memeriksa sesi login...
      </div>
    );
  }

  if (!user) {
    return <LoginView onSuccess={(authedUser) => void bootstrapForUser(authedUser)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-900">
      <AppHeader
        user={user}
        onLogout={() => void handleLogout()}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        years={years}
        selectedYear={selectedYear}
        onSelectYear={(y) => void loadYearData(y, true)}
        puskesmas={report?.puskesmas ?? 'PAYOLANSEK'}
        kota={report?.kota ?? 'PAYAKUMBUH'}
        onImportFile={(file) => void handleImport(file)}
        onExportExcel={handleExport}
        isImporting={isImporting}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {toast && (
          <div
            role="status"
            className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              toast.type === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{toast.text}</span>
          </div>
        )}

        {isLoading || !report ? (
          <div className="space-y-4" aria-busy="true" aria-label="Memuat laporan">
            <div className="h-28 animate-pulse rounded-xl bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
            <div className="h-72 animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                year={report.year}
                selectedMonth={selectedMonth}
                onSelectMonth={setSelectedMonth}
                kunjunganYear={kunjunganYear}
                layananYear={layananYear}
                onGoToInput={(m, kelIdx, sh) => {
                  const targetKel =
                    user.role === 'petugas' && user.kelurahanIdx !== null
                      ? user.kelurahanIdx
                      : kelIdx;
                  setSelectedMonth(m);
                  setSelectedKelurahan(targetKel);
                  setSelectedSheet(sh);
                  setActiveTab('input');
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsView
                year={report.year}
                selectedMonth={selectedMonth}
                onChangeMonth={setSelectedMonth}
                kunjunganYear={kunjunganYear}
                layananYear={layananYear}
              />
            )}

            {activeTab === 'input' && (
              <InputWorkspace
                user={user}
                report={report}
                month={selectedMonth}
                kelurahanIdx={selectedKelurahan}
                sheet={selectedSheet}
                onChangeMonth={setSelectedMonth}
                onChangeKelurahan={setSelectedKelurahan}
                onChangeSheet={setSelectedSheet}
                onSaveKunjungan={handleSaveKunjungan}
                onSaveLayanan={handleSaveLayanan}
                onCopyPosyanduPrevMonth={handleCopyPosyandu}
              />
            )}

            {activeTab === 'table' && (
              <TablePreviewView
                year={report.year}
                month={selectedMonth}
                onChangeMonth={setSelectedMonth}
                kunjunganYear={kunjunganYear}
                layananYear={layananYear}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                key={`${report.year}-${user.id}`}
                user={user}
                report={report}
                onSaveSettings={async (payload) => {
                  const updated = await saveSettings(report.year, payload);
                  setReport(updated);
                  setYears(await fetchYears());
                }}
                onCreateYear={async (y, copyFrom) => {
                  const created = await createYear(y, copyFrom);
                  setYears(await fetchYears());
                  setReport(created);
                  setSelectedYear(created.year);
                  setSelectedMonth(1);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
