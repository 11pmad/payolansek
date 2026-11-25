import { describe, expect, it } from 'vitest';
import {
  computeMonthLayanan,
  computeYearKunjungan,
  createEmptyKunjunganInput,
  createEmptyLayananInput,
  getKunjunganWarnings,
} from '../shared/calculations.js';
import { KELURAHAN_LIST } from '../shared/types.js';

describe('Calculation Engine', () => {
  it('computes cumulative Lansia Lama across months and guards zero Sasaran division', () => {
    const months: Record<number, ReturnType<typeof createEmptyKunjunganInput>[]> = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = KELURAHAN_LIST.map(() => createEmptyKunjunganInput());
    }

    // Jan Payolansek: sasaran 60-69 L=10, P=10, dg60_69L=4, lg60_69P=6
    months[1][0].sas60_69L = 10;
    months[1][0].sas60_69P = 10;
    months[1][0].dg60_69L = 4;
    months[1][0].lg60_69P = 6;

    // Feb Payolansek: same sasaran, dg60_69L=2, lg60_69P=3
    months[2][0].sas60_69L = 10;
    months[2][0].sas60_69P = 10;
    months[2][0].dg60_69L = 2;
    months[2][0].lg60_69P = 3;

    const computed = computeYearKunjungan(months);

    // Jan checks
    expect(computed[1].rows[0].dg60_69L_Lama).toBe(0);
    expect(computed[1].rows[0].sasTotal60).toBe(20);
    expect(computed[1].rows[0].komdatTotal).toBe(10);
    expect(computed[1].rows[0].komdatPct).toBeCloseTo(50, 4);

    // Feb cumulative Lama = Jan Lama (0) + Jan Baru (4) = 4
    expect(computed[2].rows[0].dg60_69L_Lama).toBe(4);
    expect(computed[2].rows[0].lg60_69P_Lama).toBe(6);
    expect(computed[2].rows[0].komdatL).toBe(6); // 4 + 2
    expect(computed[2].rows[0].komdatP).toBe(9); // 6 + 3
    expect(computed[2].rows[0].komdatTotal).toBe(15);
    expect(computed[2].rows[0].komdatPct).toBeCloseTo(75, 4);

    // Other kelurahan with 0 sasaran must yield 0% without NaN/Infinity
    expect(computed[1].rows[1].komdatPct).toBe(0);
  });

  it('computes Layanan kelainan totals separately for L and P', () => {
    const rows = KELURAHAN_LIST.map(() => createEmptyLayananInput());
    rows[0].sas60_69L = 272;
    rows[0].sas60_69P = 276;
    rows[0].sas70L = 17;
    rows[0].sas70P = 18;
    rows[0].tdRendahL = 2;
    rows[0].tdRendahP = 3;
    rows[0].dmP = 2;

    const computed = computeMonthLayanan(1, rows);
    expect(computed.rows[0].sasTotal60).toBe(583);
    expect(computed.rows[0].kelainanL).toBe(2);
    expect(computed.rows[0].kelainanP).toBe(5);
    expect(computed.rows[0].kelainanTotal).toBe(7);
  });

  it('emits soft warning when komdatTotal exceeds sasTotal60', () => {
    const months: Record<number, ReturnType<typeof createEmptyKunjunganInput>[]> = {};
    for (let m = 1; m <= 12; m++) {
      months[m] = KELURAHAN_LIST.map(() => createEmptyKunjunganInput());
    }
    months[1][0].sas60_69L = 5;
    months[1][0].dg60_69L = 8;

    const computed = computeYearKunjungan(months);
    const warnings = getKunjunganWarnings(computed[1].rows[0]);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
