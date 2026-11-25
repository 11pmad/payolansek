import { useState, type FormEvent } from 'react';
import { AlertCircle, Eye, EyeOff, FileSpreadsheet, LogIn } from 'lucide-react';
import type { AuthUser } from '../../shared/types.js';
import { login } from '../api.js';

interface LoginViewProps {
  onSuccess: (user: AuthUser) => void;
}

export function LoginView({ onSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError('Masukkan username dan password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      onSuccess(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal masuk ke sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAF9] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0D7A6F] text-white">
            <FileSpreadsheet className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">SIMLANSIA Payolansek</h1>
            <p className="text-xs text-slate-500">
              Sistem Pelaporan Kesehatan Lansia • Kota Payakumbuh
            </p>
          </div>
        </div>

        <h2 className="mb-1 text-base font-semibold text-slate-900">Masuk Petugas</h2>
        <p className="mb-5 text-xs text-slate-500">
          Silakan masuk menggunakan akun Puskesmas atau Kelurahan Anda.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Contoh: admin"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-10 pl-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D7A6F] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/20"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0D7A6F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0A645B] focus:outline-none focus:ring-2 focus:ring-[#0D7A6F]/40 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>{isSubmitting ? 'Memeriksa...' : 'Masuk'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
