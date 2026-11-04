import { CalculatorShell } from '@/components/calculators/calculator-shell';
import { LoanForm } from '@/components/calculators/loan-form';
import { CalculatorExplanation } from '@/components/site/calculator-explanation';
import { calculatorContent } from '@/content/calculators';
import { calculatorExplanations } from '@/content/methodology';
import { buildPageMetadata } from '@/lib/site';
export const metadata = buildPageMetadata('/calculators/loan', calculatorContent['loan'].title, calculatorExplanations['loan'].description);
export default function LoanPage() { return <CalculatorShell kind="loan"><LoanForm /><CalculatorExplanation kind="loan" /></CalculatorShell>; }
