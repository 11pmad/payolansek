import type {
  AuthUser,
  KunjunganInput,
  LayananInput,
  UserRecord,
  UserRole,
  YearReportData,
  YearSummary,
} from '../shared/types.js';

export interface StoredAuthUser extends AuthUser {
  passwordHash: string;
}

export interface ReportStore {
  close(): Promise<void>;
  listYears(): Promise<YearSummary[]>;
  hasYear(year: number): Promise<boolean>;
  getYearReport(year: number): Promise<YearReportData | null>;
  saveYearReport(report: YearReportData): Promise<void>;
  upsertKunjungan(
    year: number,
    month: number,
    kelurahanIdx: number,
    data: KunjunganInput,
  ): Promise<string>;
  upsertLayanan(
    year: number,
    month: number,
    kelurahanIdx: number,
    data: LayananInput,
  ): Promise<string>;
  createYear(year: number, copyFromYear?: number): Promise<YearReportData>;

  countUsers(): Promise<number>;
  listUsers(): Promise<UserRecord[]>;
  getUserByUsername(username: string): Promise<StoredAuthUser | null>;
  getUserById(id: number): Promise<StoredAuthUser | null>;
  createUser(params: {
    username: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    kelurahanIdx: number | null;
  }): Promise<UserRecord>;
  updateUserPassword(id: number, passwordHash: string): Promise<void>;
  deleteUser(id: number): Promise<void>;

  createSession(userId: number, token: string, expiresAt: string): Promise<void>;
  getSessionUser(token: string): Promise<AuthUser | null>;
  deleteSession(token: string): Promise<void>;
  deleteUserSessions(userId: number): Promise<void>;
}
