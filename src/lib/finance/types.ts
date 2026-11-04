export type ISODate = string;
export type Money = string;
export type CalculatorKind = 'deposit' | 'savings' | 'loan' | 'credit-card';
export type CashEvent = { date: ISODate; amount: Money };
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
export type CardInput = {
  ownFunds: Money; purchaseAmount: Money; creditLimit: Money;
  purchaseDate: ISODate; repaymentDate: ISODate; fees: Money;
  repayments: { date: ISODate; amount: Money }[]; savings: SavingsTerms;
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
export type LoanRow = {
  date: ISODate; principal: Money; interest: Money; fee: Money;
  payment: Money; balance: Money;
};
export type LoanResult = {
  firstPayment: Money; lastPayment: Money; totalInterest: Money;
  totalFees: Money; overpayment: Money; totalPaid: Money; rows: LoanRow[];
};
export type CardResult = {
  viable: boolean; deficit: Money; cardFunded: Money; debtAtRepayment: Money;
  comparisonEndDate: ISODate; availableAtRepayment: Money;
  baseline: AccountResult; strategy: AccountResult | null;
  extraInterest: Money | null; netBenefit: Money | null;
};
export type Inputs = { deposit: DepositInput; savings: SavingsInput; loan: LoanInput; 'credit-card': CardInput };
export type Results = { deposit: AccountResult; savings: AccountResult; loan: LoanResult; 'credit-card': CardResult };
export type FieldIssue = { path: string; message: string };
export type Validation<T> = { ok: true; value: T } | { ok: false; issues: FieldIssue[] };
