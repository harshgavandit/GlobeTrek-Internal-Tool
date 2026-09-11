import { Quotation } from '@/types';
import { numberToWords } from './number-to-words';
import { quotationTermSections } from './quotation-terms';
export function quotationDocument(q:Quotation){
 const s=q.company_snapshot;
 return {
  title:s.company_name,
  metadata:[['Quotation',q.quotation_number],['Revision',String(q.revision)],['Date',q.quotation_date],['Valid Until',q.valid_until],['Currency',q.currency],['Price List',q.price_list_name],['Prepared By',q.created_by_name]],
  customer:[['Customer',q.customer_name],['Contact',q.customer_contact_person||''],['Address',[q.customer_address,q.customer_city,q.customer_country].filter(Boolean).join(', ')],['Email',q.customer_email||''],['Phone',q.customer_phone||''],['Tax ID',q.customer_tax_number||'']],
  company:[['Company',s.company_name],['Address',s.address],['Email',s.email],['Phone',s.phone],['Website',s.website||''],['GSTIN',s.gstin]],
  totals:[['Subtotal',q.subtotal],['Packaging & Forwarding',q.packaging_charges],['Freight',q.freight_charges],['Insurance',q.insurance_charges],['Other Charges',q.other_charges],['Discount',q.discount_amount],['Tax ('+q.tax_percent+'%)',q.tax_amount],['Grand Total',q.total_amount]] as [string,number][],
  terms:quotationTermSections(q).flatMap(section=>[[`${section.number}. ${section.title}`,section.bullets.join('\n')]]),
  bank:[['Bank',s.bank_name],['Account Name',s.bank_account_name],['Account Number',s.bank_account_no],['IFSC',s.bank_ifsc],['SWIFT',s.bank_swift||''],['Branch',s.bank_branch||'']],
  words:numberToWords(q.total_amount,q.currency),
 };
}
