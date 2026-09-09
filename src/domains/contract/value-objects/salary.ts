import { ValidationError } from '@shared/domain/errors';

export class Salary {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string = 'CLP',
  ) {
    if (_amount < 0) {
      throw new ValidationError('Salary amount cannot be negative', 'salary');
    }
    if (!_currency || _currency.length !== 3) {
      throw new ValidationError('Currency must be a valid 3-letter code', 'currency');
    }
  }

  public static create(amount: number, currency: string = 'CLP'): Salary {
    return new Salary(amount, currency.toUpperCase());
  }

  public get amount(): number {
    return this._amount;
  }

  public get currency(): string {
    return this._currency;
  }

  public toString(): string {
    return `${this._amount} ${this._currency}`;
  }

  public equals(other: Salary): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  public isGreaterThan(other: Salary): boolean {
    if (this._currency !== other._currency) {
      throw new Error('Cannot compare salaries with different currencies');
    }
    return this._amount > other._amount;
  }
}
