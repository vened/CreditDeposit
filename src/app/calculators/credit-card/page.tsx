import { CalculatorShell } from '@/components/calculators/calculator-shell';
import { CreditCardForm } from '@/components/calculators/credit-card-form';
import { CalculatorExplanation } from '@/components/site/calculator-explanation';
import { calculatorContent } from '@/content/calculators';
import { calculatorExplanations } from '@/content/methodology';
import { buildPageMetadata } from '@/lib/site';
export const metadata = buildPageMetadata('/calculators/credit-card', calculatorContent['credit-card'].title, calculatorExplanations['credit-card'].description);
export default function CardPage() { return <CalculatorShell kind="credit-card"><CreditCardForm /><CalculatorExplanation kind="credit-card" /></CalculatorShell>; }
