import { v4 as uuidv4 } from 'uuid';
import { mapObject } from './objects';
import { isFunction, isString } from './compare';
import { Email } from '@domains/user/value-objects/email';
import { DateUtils as DateUtils2, DateTimeUtils } from './date';

export class UUID {
  private constructor(private readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid UUID format');
    }
  }

  public static generate(): UUID {
    return new UUID(uuidv4());
  }

  public static from(value: string): UUID {
    return new UUID(value);
  }

  public toString(): string {
    return this.value;
  }

  public equals(other: UUID): boolean {
    return this.value === other.value;
  }

  private isValid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}

export class DateUtils {
  public static now(): Date {
    return new Date();
  }

  public static addDays(date: DateType, days: number): Date {
    const result = DateUtils.parse(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  public static isAfter(date1?: DateType | null, date2?: DateType | null): boolean {
    date1 = DateUtils.parse(date1, true);
    date2 = DateUtils.parse(date2, true);
    return date1 && date2 ? date1.getTime() > date2.getTime() : false;
  }

  public static isBefore(date1?: DateType | null, date2?: DateType | null): boolean {
    date1 = DateUtils.parse(date1, true);
    date2 = DateUtils.parse(date2, true);
    return date1 && date2 ? date1.getTime() < date2.getTime() : false;
  }

  public static daysBetween(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  public static parse(date: DateType | null | undefined, nullable: true): Date | null;
  public static parse(date?: DateType | null, nullable?: false): Date;
  public static parse(date?: DateType | null, nullable?: boolean): Date | null {
    if (!date) return nullable ? null : DateUtils.now();
    const d = date instanceof Date ? date : new Date(date);
    return d.toString() === 'Invalid Date' ? (nullable ? null : DateUtils.now()) : d;
  }

  public static formatISO(date: DateType, nullable?: boolean): string | null {
    return DateUtils.parse(date, nullable as any)?.toISOString() ?? null;
  }
}

type DefaultParsersKeys = keyof typeof defaultParsers;
type ParsersList<T extends object> = Partial<Record<keyof T, ParserMethod | DefaultParsersKeys>>;
type ParserMethod = Function; // eslint-disable-line @typescript-eslint/no-unsafe-function-type

const defaultParsers = Object.freeze({
  date: (value?: DateType) => DateUtils2.parse(value),
  dateNullable: (value?: DateType) => DateUtils2.parse(value, true),
  datetime: (value?: DateType) => DateTimeUtils.parse(value),
  datetimeNullable: (value?: DateType) => DateTimeUtils.parse(value, true),
  email: (value?: string | Email) => Email.create(value),
  uuid: (value?: string) => value ?? uuidv4(),
} as const);

export class EntityUtils {
  /**
   * @param a Main object
   * @param b Object with parameters to assign
   * @param parserList List of parsers (optional)
   */
  static assign<A extends object, B extends object, P extends ParsersList<A>>(
    a: A,
    b: B,
    parserList?: P,
  ): A {
    const parserKeys = Object.keys(defaultParsers);
    const parsers = (!parserList ? {} : mapObject(parserList, (parser) => {
      if (isFunction(parser)) return parser;
      return isString(parser) && parserKeys.includes(parser) ? defaultParsers[parser] : undefined;
    })) as Record<keyof P, ParserMethod | undefined>;

    // 1. Assign from b
    Object.keys(b).forEach(key => {
      const parser = parsers?.[key as unknown as keyof P];
      // @ts-expect-error: We know that the key is in `a` and `b`
      a[key] = isFunction(parser) ? parser(b[key]) : b[key];
    });

    // 2. Handle parsers for keys missing in b (e.g. auto-generation)
    if (parserList) {
      Object.keys(parserList).forEach(key => {
        if (!(key in b)) {
          const parser = parsers?.[key as unknown as keyof P];
          if (isFunction(parser)) {
            // @ts-expect-error: We know that the key is in `a`
            a[key] = parser(undefined);
          }
        }
      });
    }

    return a;
  }

  /**
   * Retorna un transformer de TypeORM para columnas de tipo 'date'
   * que preserva el formato YYYY-MM-DD sin conversión de zona horaria
   */
  public static getDateOnlyTransformer() {
    return {
      to(value: Date | string | null | undefined): string | null {
        if (!value) return null;

        const date = value instanceof Date ? value : new Date(value);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
      from(value: string | Date | null | undefined): Date | null {
        if (!value) return null;

        const dateStr = typeof value === 'string' ? value : value.toISOString().split('T')[0];
        return new Date(dateStr + 'T00:00:00.000Z');
      },
    };
  }
}

export class StringUtils {
  public static isEmpty(value?: string | null): value is null | undefined | '' {
    return !value?.trim().length;
  }

  public static isEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  public static isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  public static sanitize(value: string): string {
    return value.trim().replace(/[<>]/g, '');
  }
}
