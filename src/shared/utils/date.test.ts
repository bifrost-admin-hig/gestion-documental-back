import { describe, expect, it } from 'bun:test';
import { DateUtils } from './date';

describe('DateUtils (date-only)', () => {
  it('todayString should be YYYY-MM-DD without time', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const expected = `${y}-${m}-${day}`;
    expect(DateUtils.todayString()).toBe(expected);
  });

  it('toString should return YYYY-MM-DD for string input', () => {
    const s = DateUtils.toString('2025-11-20');
    expect(s).toBe('2025-11-20');
  });

  it('toString should return YYYY-MM-DD for Date input', () => {
    const d = new Date('2025-11-20');
    const s = DateUtils.toString(d);
    expect(s).toBe('2025-11-20');
  });

  it('parse should normalize to local midnight and keep same calendar day', () => {
    const d = DateUtils.parse('2025-11-20');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getHours()).toBe(0);
    const s = DateUtils.toString(d!);
    expect(s).toBe('2025-11-20');
  });

  it('addMonths should return YYYY-MM-DD for string input', () => {
    const before = '2025-11-20';
    const after = '2025-12-20';
    const date = DateUtils.addMonths(before, 1);
    expect(DateUtils.toString(date)).toBe(after);
  });
});
