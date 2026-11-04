import { CalculatorShell } from '@/components/calculators/calculator-shell';
import { SavingsForm } from '@/components/calculators/savings-form';
import { CalculatorExplanation } from '@/components/site/calculator-explanation';
import { calculatorContent } from '@/content/calculators';
import { calculatorExplanations } from '@/content/methodology';
import { buildPageMetadata } from '@/lib/site';
export const metadata = buildPageMetadata('/calculators/savings', calculatorContent['savings'].title, calculatorExplanations['savings'].description);
export default function SavingsPage() { return <CalculatorShell kind="savings"><SavingsForm /><CalculatorExplanation kind="savings" /></CalculatorShell>; }
