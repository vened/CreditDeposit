import { CalculatorShell } from '@/components/calculators/calculator-shell';
import { DepositForm } from '@/components/calculators/deposit-form';
import { CalculatorExplanation } from '@/components/site/calculator-explanation';
import { calculatorContent } from '@/content/calculators';
import { calculatorExplanations } from '@/content/methodology';
import { buildPageMetadata } from '@/lib/site';
export const metadata = buildPageMetadata('/calculators/deposit', calculatorContent['deposit'].title, calculatorExplanations['deposit'].description);
export default function DepositPage() { return <CalculatorShell kind="deposit"><DepositForm /><CalculatorExplanation kind="deposit" /></CalculatorShell>; }
