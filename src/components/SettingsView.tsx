import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Check, KeyRound, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import {
  KELURAHAN_LIST,
  type AuthUser,
  type KunjunganInput,
  type LayananInput,
  type UserRecord,
  type UserRole,
  type YearReportData,
} from '../../shared/types.js';
import { n } from '../../shared/calculations.js';
import { changePassword, createUser, deleteUser, fetchUsers } from '../api.js';
import { NumericInput } from './NumericInput.js';

interface SettingsViewProps {
  user: AuthUser;
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

export function SettingsView({ user, report, onSaveSettings, onCreateYear }: SettingsViewProps) {
  const isAdmin = user.role === 'admin';

  // Report Settings State (Admin only)
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

  // Change Password State (All users)
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isChangingPw, setIsChangingPw] = useState(false);

  // User Management State (Admin only)
  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newUserPw, setNewUserPw] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('petugas');
  const [newUserKel, setNewUserKel] = useState<string>('0');
  const [isAddingUser, setIsAddingUser] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [errNotice, setErrNotice] = useState<string | null>(null);

  const showOk = (msg: string) => {
    setErrNotice(null);
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 4000);
  };

  const showErr = (msg: string) => {
    setNotice(null);
    setErrNotice(msg);
  };

  useEffect(() => {
    if (!isAdmin) return;
    void fetchUsers()
      .then(setUsersList)
      .catch((err) => showErr(err instanceof Error ? err.message : 'Gagal memuat daftar akun.'));
  }, [isAdmin]);

  const activeRows = sasTab === 'kunjungan' ? sasKunjungan : sasLayanan;
  const setActiveRows = sasTab === 'kunjungan' ? setSasKunjungan : setSasLayanan;

  const handleSave = async () => {
    setIsSaving(true);
    setErrNotice(null);
    try {
      await onSaveSettings({
        puskesmas,
        kota,
        sasaranKunjungan: sasKunjungan,
        sasaranLayanan: sasLayanan,
      });
      showOk(`Pengaturan & Sasaran tahun ${report.year} diterapkan ke seluruh 12 bulan.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setErrNotice(null);
    try {
      await onCreateYear(newYear, copySasaran ? report.year : undefined);
      showOk(`Tahun laporan ${newYear} berhasil dibuat.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Gagal membuat tahun laporan baru.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrNotice(null);
    if (newPw.length < 6) {
      showErr('Password baru minimal 6 karakter.');
      return;
    }
    if (newPw !== confirmPw) {
      showErr('Konfirmasi password baru tidak cocok.');
      return;
    }
    setIsChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showOk('Password Anda berhasil diperbarui.');
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Gagal memperbarui password.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleAddUser = async (e: FormEvent) => {
    e.preventDefault();
    setErrNotice(null);
    setIsAddingUser(true);
    try {
      const kelurahanIdx =
        newUserRole === 'admin' || newUserKel === 'all' ? null : Number(newUserKel);
      const created = await createUser({
        username: newUsername,
        password: newUserPw,
        fullName: newFullName,
        role: newUserRole,
        kelurahanIdx,
      });
      setUsersList((prev) => [...prev, created]);
      setNewUsername('');
      setNewFullName('');
      setNewUserPw('');
      showOk(`Akun "${created.username}" berhasil ditambahkan.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Gagal membuat akun petugas.');
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (target: UserRecord) => {
    setErrNotice(null);
    try {
      await deleteUser(target.id);
      setUsersList((prev) => prev.filter((u) => u.id !== target.id));
      showOk(`Akun "${target.username}" dihapus.`);
    } catch (err) {
      showErr(err instanceof Error ? err.message : 'Gagal menghapus akun.');
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

      {errNotice && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errNotice}</span>
        </div>
      )}

      {/* Ubah Password Saya (Semua Akun) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-[#0D7A6F]" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">Ubah Password Saya</h2>
            <p className="text-xs text-slate-500">
              Akun aktif: <span className="font-semibold text-slate-700">{user.username}</span> ({user.fullName})
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleChangePassword(e)} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label htmlFor="pw-current" className="mb-1 block text-xs font-semibold text-slate-700">
              Password Lama
            </label>
            <input
              id="pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="pw-new" className="mb-1 block text-xs font-semibold text-slate-700">
              Password Baru (min. 6)
            </label>
            <input
              id="pw-new"
              type="password"
              autoComplete="new-password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="pw-confirm" className="mb-1 block text-xs font-semibold text-slate-700">
              Konfirmasi Password Baru
            </label>
            <input
              id="pw-confirm"
              type="password"
              autoComplete="new-password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isChangingPw}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0D7A6F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A645B] disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{isChangingPw ? 'Menyimpan...' : 'Simpan Password'}</span>
            </button>
          </div>
        </form>
      </section>

      {isAdmin && (
        <>
          {/* Kelola Akun Petugas (Admin Only) */}
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[#0D7A6F]" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-slate-900">Kelola Akun Petugas</h2>
                <p className="text-xs text-slate-500">
                  Buat akun untuk Admin Puskesmas atau Petugas Kelurahan tertentu.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => void handleAddUser(e)}
              className="mb-5 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-6"
            >
              <div>
                <label htmlFor="u-username" className="mb-1 block text-xs font-semibold text-slate-700">
                  Username
                </label>
                <input
                  id="u-username"
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="mis. bulba"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="u-fullname" className="mb-1 block text-xs font-semibold text-slate-700">
                  Nama Petugas
                </label>
                <input
                  id="u-fullname"
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="u-password" className="mb-1 block text-xs font-semibold text-slate-700">
                  Password Awal
                </label>
                <input
                  id="u-password"
                  type="password"
                  required
                  value={newUserPw}
                  onChange={(e) => setNewUserPw(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="u-role" className="mb-1 block text-xs font-semibold text-slate-700">
                  Peran
                </label>
                <select
                  id="u-role"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none"
                >
                  <option value="petugas">Petugas</option>
                  <option value="admin">Admin Puskesmas</option>
                </select>
              </div>

              <div>
                <label htmlFor="u-kel" className="mb-1 block text-xs font-semibold text-slate-700">
                  Kelurahan Tugas
                </label>
                <select
                  id="u-kel"
                  disabled={newUserRole === 'admin'}
                  value={newUserRole === 'admin' ? 'all' : newUserKel}
                  onChange={(e) => setNewUserKel(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0D7A6F] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="all">Semua Kelurahan</option>
                  {KELURAHAN_LIST.map((k) => (
                    <option key={k.id} value={String(k.idx)}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0D7A6F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0A645B] disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>{isAddingUser ? 'Menambah...' : 'Tambah'}</span>
                </button>
              </div>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Username</th>
                    <th className="px-3 py-2.5 font-semibold">Nama Petugas</th>
                    <th className="px-3 py-2.5 font-semibold">Peran</th>
                    <th className="px-3 py-2.5 font-semibold">Akses Kelurahan</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td className="px-3 py-2.5 font-medium text-slate-900">{u.username}</td>
                      <td className="px-3 py-2.5 text-slate-700">{u.fullName}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-[#F0FDFA] text-[#0D7A6F]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.role === 'admin' ? 'Admin' : 'Petugas'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {u.role === 'admin' || u.kelurahanIdx === null
                          ? 'Semua Kelurahan'
                          : KELURAHAN_LIST[u.kelurahanIdx]?.name ?? '-'}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {u.id !== user.id ? (
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(u)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Hapus</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Akun aktif</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

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
        </>
      )}
    </div>
  );
}
