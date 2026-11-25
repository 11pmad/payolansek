export type NavTab = 'dashboard' | 'analytics' | 'input' | 'table' | 'settings';

export const TAB_TO_PATH: Record<NavTab, string> = {
  dashboard: '/ringkasan',
  analytics: '/analisis',
  input: '/input',
  table: '/tabel',
  settings: '/pengaturan',
};

export const TAB_TITLES: Record<NavTab, string> = {
  dashboard: 'Ringkasan',
  analytics: 'Analisis',
  input: 'Input Laporan',
  table: 'Pratinjau Tabel',
  settings: 'Pengaturan',
};

export function pathToTab(pathname: string): NavTab | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const [tab, routePath] of Object.entries(TAB_TO_PATH) as Array<[NavTab, string]>) {
    if (normalized === routePath) return tab;
  }
  return null;
}
