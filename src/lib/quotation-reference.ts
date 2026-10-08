import type { Quotation } from '@/types';

type EnquiryReference = Pick<Quotation, 'customer_reference' | 'customer_enquiry_date' | 'quotation_number'>;

export function quotationEnquiryReference(quotation: EnquiryReference): string {
  const reference = quotation.customer_reference?.trim();
  const date = quotation.customer_enquiry_date;
  if (date) {
    const parsed = new Date(`${date}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date) {
      const formatted = new Intl.DateTimeFormat('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
      }).format(parsed);
      return `${reference || 'Your Email Enquiry'} Dt. ${formatted}`;
    }
  }
  return reference || quotation.quotation_number;
}
