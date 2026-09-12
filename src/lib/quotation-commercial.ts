import type { Quotation, QuotationChargeField, QuotationFormState } from '@/types';

export const QUOTATION_CHARGE_FIELDS = [
  'discount_amount',
  'packaging_charges',
  'freight_charges',
  'insurance_charges',
  'other_charges',
  'tax_percent',
] as const satisfies readonly QuotationChargeField[];

export const QUOTATION_CHARGE_LABELS: Record<QuotationChargeField, string> = {
  discount_amount: 'Discount',
  packaging_charges: 'Packing Charge',
  freight_charges: 'Freight Charge',
  insurance_charges: 'Insurance',
  other_charges: 'Other Charges',
  tax_percent: 'GST / Tax',
};

export function normalizeVisibleCharges(
  value: readonly string[] | undefined,
): QuotationChargeField[] {
  // Older quotation snapshots displayed every commercial row.
  if (value === undefined) return [...QUOTATION_CHARGE_FIELDS];
  return QUOTATION_CHARGE_FIELDS.filter((field) => value.includes(field));
}

export function isChargeVisible(
  quotation: Pick<QuotationFormState, 'visible_charges'>,
  field: QuotationChargeField,
) {
  return normalizeVisibleCharges(quotation.visible_charges).includes(field);
}

export function quotationTotalRows(quotation: Quotation): [string, number][] {
  const rows: [string, number][] = [['Sub Total', quotation.subtotal]];
  const visible = normalizeVisibleCharges(quotation.visible_charges);

  if (visible.includes('packaging_charges')) rows.push(['Packing Charge', quotation.packaging_charges]);
  if (visible.includes('freight_charges')) rows.push(['Freight Charge', quotation.freight_charges]);
  if (visible.includes('insurance_charges')) rows.push(['Insurance', quotation.insurance_charges]);
  if (visible.includes('other_charges')) rows.push(['Other Charges', quotation.other_charges]);
  if (visible.includes('discount_amount')) rows.push(['Discount', quotation.discount_amount]);
  if (visible.includes('tax_percent')) rows.push([`GST @${quotation.tax_percent}%`, quotation.tax_amount]);

  rows.push(['Grand Total', quotation.total_amount]);
  return rows;
}
