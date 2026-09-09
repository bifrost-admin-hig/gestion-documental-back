import { ValidationError } from '@shared/domain/errors';

export class Email {
  private constructor(
    private readonly value?: string,
    field?: string,
  ) {
    if (!Email.isValid(value)) {
      throw new ValidationError('Invalid email format', field || 'email');
    }
  }

  static create(value?: string | Email, field?: string): Email {
    return value instanceof Email ? value : new Email(value, field);
  }

  toString(): string {
    return this.value!;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  static isValid(value?: string | Email): boolean {
    if (value instanceof Email) return true;
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(v);
  }
}
