import type { ISODate, Money } from './types';

export class CalculationError extends Error {
  constructor(public readonly date: ISODate, public readonly deficit: Money) {
    super(`Недостаточно средств ${date}: ${deficit} ₽`);
    this.name = 'CalculationError';
  }
}
