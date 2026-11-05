export type ISODate = string;
export type Money = string;
export type CalculatorKind = 'deposit' | 'savings' | 'loan' | 'credit-card';
export type CashEvent = { date: ISODate; amount: Money };
export type RecurringTopUp = {
  amount: Money; startDate: ISODate; endDate: ISODate; frequency: 'daily' | 'weekly' | 'monthly';
};
export type RateChange = { date: ISODate; annualRate: string };
export type SavingsTerms = {
  annualRate: string; basis: 'daily' | 'monthly-min';
  payout: 'daily' | 'monthly'; capitalize: boolean;
  partialMonths: 'actual' | 'exclude'; rateChanges: RateChange[];
};
export type SavingsInput = SavingsTerms & {
  openingBalance: Money; startDate: ISODate; endDate: ISODate; events: CashEvent[];
};
export type DepositInput = {
  openingBalance: Money; annualRate: string; startDate: ISODate; endDate: ISODate;
  payout: 'monthly' | 'maturity'; capitalize: boolean;
  events: CashEvent[]; rateChanges: RateChange[];
};
export type LoanInput = {
  principal: Money; annualRate: string; months: number; issuedOn: ISODate;
  scheme: 'annuity' | 'differentiated'; upfrontFee: Money; monthlyFee: Money;
};
export type CardInput = CardPlanningInput;
export type CardPlanningInput = {
  ownFunds: Money; creditLimit: Money; startDate: ISODate; endDate: ISODate;
  monthlySpending: Money; spendingOverrides: Record<string, Money>; repaymentDay: number; fees: Money;
  repayments: CashEvent[]; topUps: CashEvent[]; recurringTopUps: RecurringTopUp[]; savings: SavingsTerms;
};
export type MonthRow = {
  month: string; days: number; openingBalance: Money; netFlow: Money;
  minimumBalance: Money; earnedInterest: Money; paidInterest: Money;
  pendingInterest: Money; closingBalance: Money;
};
export type AccountResult = {
  earnedInterest: Money; paidInterest: Money; pendingInterest: Money;
  paidExternally: Money; closingBalance: Money; netContributions: Money;
  capital: Money; months: MonthRow[];
};
export type CardPlanningMonthRow = MonthRow & {
  endDate: ISODate; spending: Money; topUps: Money; cardSpending: Money; ownFundsSpending: Money;
  manualRepayments: Money; automaticRepayments: Money; fees: Money; closingDebt: Money; capital: Money;
};
export type CardPlanningScenario =
  | { ok: true; account: AccountResult; rows: CardPlanningMonthRow[]; debt: Money; capital: Money }
  | { ok: false; failure: { kind: 'insufficient-funds'; date: ISODate; deficit: Money } };
export type CardPlanningResult = {
  baseline: CardPlanningScenario; strategy: CardPlanningScenario; extraInterest: Money | null; netBenefit: Money | null;
};
export type LoanRow = {
  date: ISODate; principal: Money; interest: Money; fee: Money;
  payment: Money; balance: Money;
};
export type LoanResult = {
  firstPayment: Money; lastPayment: Money; totalInterest: Money;
  totalFees: Money; overpayment: Money; totalPaid: Money; rows: LoanRow[];
};
export type CardResult = CardPlanningResult;
export type Inputs = { deposit: DepositInput; savings: SavingsInput; loan: LoanInput; 'credit-card': CardInput };
export type Results = { deposit: AccountResult; savings: AccountResult; loan: LoanResult; 'credit-card': CardResult };
export type FieldIssue = { path: string; message: string };
export type Validation<T> = { ok: true; value: T } | { ok: false; issues: FieldIssue[] };
