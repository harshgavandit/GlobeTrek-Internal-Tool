import Decimal from 'decimal.js';
import { QuotationFormState } from '@/types';

export function calculateLineItemTotal(
  unitPrice: number,
  quantity: number,
  discountPercent = 0
): number {
  const price = new Decimal(unitPrice || 0);
  const qty = new Decimal(quantity || 0);
  const disc = new Decimal(discountPercent || 0);

  const base = price.times(qty);
  const discountAmount = base.times(disc.dividedBy(100));
  const total = base.minus(discountAmount);

  return total.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function recalculateQuotation(formState: QuotationFormState): QuotationFormState {
  const recalculatedItems = formState.items.map((item) => {
    const line_total = calculateLineItemTotal(
      item.unit_price,
      item.quantity,
      item.discount_percent
    );
    return {
      ...item,
      line_total,
    };
  });

  const subtotalDecimal = recalculatedItems.reduce(
    (acc, it) => acc.plus(new Decimal(it.line_total)),
    new Decimal(0)
  );

  const packaging = new Decimal(formState.packaging_charges || 0);
  const freight = new Decimal(formState.freight_charges || 0);
  const insurance = new Decimal(formState.insurance_charges || 0);
  const other = new Decimal(formState.other_charges || 0);
  const taxRate = new Decimal(formState.tax_percent || 0);

  const taxableAmount = subtotalDecimal
    .plus(packaging)
    .plus(freight)
    .plus(insurance)
    .plus(other)
    .minus(new Decimal(formState.discount_amount || 0));

  const taxAmountDecimal = taxableAmount
    .times(taxRate.dividedBy(100))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  const totalAmountDecimal = taxableAmount
    .plus(taxAmountDecimal)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    ...formState,
    items: recalculatedItems,
    subtotal: subtotalDecimal.toNumber(),
    tax_amount: taxAmountDecimal.toNumber(),
    total_amount: totalAmountDecimal.toNumber(),
  };
}
