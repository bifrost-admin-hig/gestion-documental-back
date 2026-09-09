export class DateUtils {
  public static addMonths(date: DateType, months: number): Date {
    const d = DateUtils.parse(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  public static addDays(date: DateType, days: number): Date {
    const d = DateUtils.parse(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  public static isAfter(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateUtils.parse(date1, true);
    const d2 = DateUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() > d2.getTime() : false;
  }

  public static isBefore(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateUtils.parse(date1, true);
    const d2 = DateUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() < d2.getTime() : false;
  }

  public static isMax(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateUtils.parse(date1, true);
    const d2 = DateUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() <= d2.getTime() : false;
  }

  public static isMin(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateUtils.parse(date1, true);
    const d2 = DateUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() >= d2.getTime() : false;
  }

  private static isValid(date: Date | null): date is Date {
    return !!date && date.toString() !== 'Invalid Date';
  }

  public static daysBetween(date1?: DateType | null, date2?: DateType | null): number | null {
    const d1 = DateUtils.parse(date1, true);
    const d2 = DateUtils.parse(date2, true);
    if (!d1 || !d2) return null;
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public static parse(date?: DateType | null, nullable?: false): Date;
  public static parse(date?: DateType | null, nullable?: boolean): Date | null;
  public static parse(date?: DateType | null, nullable?: boolean): Date | null {
    const d = DateUtils.toDate(date);
    if (!DateUtils.isValid(d)) return nullable ? null : DateUtils.today();
    return d;
  }

  private static toDate(date?: DateType | null): Date | null {
    if (!date) return null;
    if (date instanceof Date) {
      const y = date.getUTCFullYear();
      const mo = date.getUTCMonth();
      const d = date.getUTCDate();
      const local = new Date(y, mo, d);
      local.setHours(0, 0, 0, 0);
      return local;
    }
    if (typeof date === 'string') {
      const m = date.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
      if (m) {
        const y = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const d = parseInt(m[3], 10);
        const local = new Date(y, mo, d);
        local.setHours(0, 0, 0, 0);
        return local;
      }
    }
    return new Date(date as any);
  }

  public static today(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /** A string date (without time) in ISO format */
  public static todayString(): string {
    const d = DateUtils.today();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** A date as a string (without time) in ISO format */
  public static toString(date?: DateType | null, nullable?: false): string;
  public static toString(date?: DateType | null, nullable?: boolean): string | null;
  public static toString(date?: DateType | null, nullable?: boolean): string | null {
    const d = DateUtils.parse(date, nullable);
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  public static toLocalDate(date?: DateType | null, nullable?: false): Date;
  public static toLocalDate(date?: DateType | null, nullable?: boolean): Date | null;
  public static toLocalDate(date?: DateType | null, nullable?: boolean): Date | null {
    const s = DateUtils.toString(date, nullable);
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
}

export class DateTimeUtils {
  public static isAfter(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateTimeUtils.parse(date1, true);
    const d2 = DateTimeUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() > d2.getTime() : false;
  }

  public static isBefore(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateTimeUtils.parse(date1, true);
    const d2 = DateTimeUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() < d2.getTime() : false;
  }

  public static isMax(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateTimeUtils.parse(date1, true);
    const d2 = DateTimeUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() <= d2.getTime() : false;
  }

  public static isMin(date1?: DateType | null, date2?: DateType | null): boolean {
    const d1 = DateTimeUtils.parse(date1, true);
    const d2 = DateTimeUtils.parse(date2, true);
    return d1 && d2 ? d1.getTime() >= d2.getTime() : false;
  }

  private static isValid(date: Date | null): date is Date {
    return !!date && date.toString() !== 'Invalid Date';
  }

  public static now(): Date {
    return new Date();
  }

  public static parse(date?: DateType | null, nullable?: false): Date;
  public static parse(date?: DateType | null, nullable?: boolean): Date | null;
  public static parse(date?: DateType | null, nullable?: boolean): Date | null {
    date = DateTimeUtils.toDate(date);
    return DateTimeUtils.isValid(date) ? date : (nullable ? null : DateTimeUtils.now());
  }

  private static toDate(date?: DateType | null): Date | null {
    if (!date) return null;
    return date instanceof Date ? date : new Date(date);
  }

  public static toString(date?: DateType | null, nullable?: false): string;
  public static toString(date?: DateType | null, nullable?: boolean): string | null;
  public static toString(date?: DateType | null, nullable?: boolean): string | null {
    return DateTimeUtils.parse(date, nullable)?.toISOString() ?? null;
  }
}
