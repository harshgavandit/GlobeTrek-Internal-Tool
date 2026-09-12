import { Quotation } from '@/types';

export const STANDARD_TERMS_VERSION='globetrek-2026-09';

export interface QuotationTermSection {number:number;title:string;bullets:string[]}
export interface QuotationBankAccount {bank_name:string;account_name:string;account_no:string;ifsc:string;branch?:string;swift?:string}

export const EXPORT_QUOTATION_DEFAULTS={
 payment_terms:'A)50% advance along with PO & Balance 50% against Proforma Invoice prior to dispatch\nB)100% advance through Bank /Cash (bank details given below)',
 delivery_terms:'Within 3-4 weeks after receipt of Purchase Order along with Payment.',
 warranty_terms:'The instrument is warranted against any manufacturing defect for ‘One Year’ from the date of delivery, if it is operated under normal working conditions. The defects due to power fluctuation, improper earthing, false operation of machine, over loading etc. Will not be covered under this warranty.',
 validity_terms:'The above Quotation is valid for 30 days from date of Quotation',
 freight_terms:'Freight will be charge extra at actual as per the customers preferred transport service.',
 notes:'All clerical and typographical errors are subject to correction.'
} as const;

export function quotationBankAccounts(quotation:Quotation):QuotationBankAccount[]{
 const settings=quotation.company_snapshot;
 const configured=(settings.bank_accounts||[]).filter(account=>account.bank_name||account.account_no||account.ifsc);
 if(configured.length)return configured;
 if(!settings.bank_name&&!settings.bank_account_no&&!settings.bank_ifsc)return [];
 return [{bank_name:settings.bank_name,account_name:settings.bank_account_name,account_no:settings.bank_account_no,ifsc:settings.bank_ifsc,branch:settings.bank_branch,swift:settings.bank_swift}];
}

const standardSections=(quotation:Quotation):QuotationTermSection[]=>[
 {number:1,title:'Validity of Quotation',bullets:[
  'This quotation shall remain valid for 30 days from the date of issue.',
  'Any amendments or revisions after the validity period will be subject to prevailing market conditions.'
 ]},
 {number:2,title:'Goods and Services Tax (GST)',bullets:[
  'GST will be charged extra as applicable as per the prevailing rates.',
  `GSTIN: ${quotation.company_snapshot.gstin||'27AAMFG8874A1Z4'}`
 ]},
 {number:3,title:'Delivery Schedule',bullets:[
  'Delivery shall be made from available stock or within 1 to 2 weeks from the date of receipt of a technically and commercially clear firm order in writing.',
  'For specific delivery schedules, kindly contact us directly.'
 ]},
 {number:4,title:'Pricing & Packing',bullets:[
  'All prices are quoted on an Ex-Godown, Navi Mumbai basis.',
  'Packing and Forwarding Charges are not included and will be billed extra at actuals.',
  'Final packing and forwarding charges will be communicated at the time of order confirmation, based on the volume, weight, and quantity of the goods.'
 ]},
 {number:5,title:'Freight and Transit',bullets:[
  'Freight, insurance, and all transit-related charges shall be borne by the buyer.',
  'Unless otherwise specified, shipments will be dispatched via the nearest and most reliable transporter or courier on a Freight-to-Pay basis.',
  'If the buyer wishes to utilize a specific transporter or courier, the same must be clearly mentioned in the Purchase Order with relevant details.'
 ]},
 {number:6,title:'Unloading',bullets:[
  'The responsibility for the safe unloading of goods from the transporter and placement within the designated premises lies solely with the buyer and is not covered under our scope of supply.'
 ]},
 {number:7,title:'Liability for Breakage',bullets:[
  'While every precaution is taken to ensure safe packaging, our liability ceases upon handing over the goods to the transporter.',
  'We shall not be held responsible for any damage, loss, or shortages occurring during transit.'
 ]},
 {number:8,title:'Insurance',bullets:[
  'Transit Insurance is available at an additional cost upon request. This coverage is optional and will be charged separately.'
 ]},
 {number:9,title:'Jurisdiction',bullets:[
  'All disputes, differences, or claims arising out of or in connection with this quotation shall be subject to the exclusive jurisdiction of Mumbai courts.'
 ]},
 {number:10,title:'Payment Terms',bullets:[
  '100% payment is required against the proforma invoice prior to dispatch.',
  'Payments can be made via bank transfer or cash, as per the bank details provided below.'
 ]},
 {number:11,title:'Bank Charges',bullets:[
  'All bank charges related to payments, including remittance fees, will be borne by the buyer.'
 ]},
 {number:12,title:'Warranty',bullets:[
  'The instrument is covered under a one-year warranty from the date of delivery, against manufacturing defects when operated under normal working conditions.',
  'The warranty does not cover damages resulting from: Power fluctuations, Improper earthing, Incorrect operation, Overloading, Misuse, negligence, or external damages, Etc.'
 ]},
 {number:13,title:'Commissioning & Installation',bullets:[
  'Erection, commissioning, and installation of the equipment will be charged separately, if applicable.'
 ]},
 {number:14,title:'Errors & Omissions',bullets:[
  'All clerical, typographical, or calculation errors are subject to correction without prior notice.'
 ]}
];

const exportSections=(quotation:Quotation):QuotationTermSection[]=>{
 const account=quotationBankAccounts(quotation)[0];
 return [
  {number:1,title:'PRICES',bullets:['Each unit is quoted in USD Ex-Work Mumbai. All Export worthy Packing & Forwarding will be charge extra.']},
  {number:2,title:'FREIGHT',bullets:[quotation.freight_terms||EXPORT_QUOTATION_DEFAULTS.freight_terms]},
  {number:3,title:'VALIDITY',bullets:[quotation.validity_terms||EXPORT_QUOTATION_DEFAULTS.validity_terms]},
  {number:4,title:'DELIVERY',bullets:[quotation.delivery_terms||EXPORT_QUOTATION_DEFAULTS.delivery_terms]},
  {number:5,title:'PAYMENT',bullets:(quotation.payment_terms||EXPORT_QUOTATION_DEFAULTS.payment_terms).split(/\r?\n/)},
  {number:6,title:'BANK DETAIL',bullets:account?[
   `Company name: ${account.account_name||quotation.company_snapshot.company_name}`,
   `Account number: ${account.account_no}`,
   `IFSC: ${account.ifsc}`,
   `SWIFT code: ${account.swift||quotation.company_snapshot.bank_swift||''}`,
   `Bank name: ${account.bank_name}`,
   `Branch: ${account.branch||''}`
  ]:[]},
  {number:7,title:'LOCAL LEVIES',bullets:['Local Levies/ Octroi if applicable will have to be borne by the customer.']},
  {number:8,title:'WARRANTY',bullets:[quotation.warranty_terms||EXPORT_QUOTATION_DEFAULTS.warranty_terms]},
  {number:9,title:'COMMISSIONING',bullets:['Erection and commissioning of the machine / equipment will be charged extra. (if applicable)']},
  {number:10,title:'BANK CHARGES',bullets:['On your account']},
  {number:11,title:'ERRORS',bullets:[quotation.notes||EXPORT_QUOTATION_DEFAULTS.notes]}
 ];
};

const legacySections=(quotation:Quotation):QuotationTermSection[]=>[
 {number:1,title:'Validity of Quotation',bullets:[quotation.validity_terms]},
 {number:2,title:'Goods and Services Tax (GST)',bullets:[`GST @${quotation.tax_percent}%: ${quotation.currency} ${quotation.tax_amount.toFixed(2)}`,quotation.company_snapshot.gstin?`GSTIN: ${quotation.company_snapshot.gstin}`:'']},
 {number:3,title:'Delivery Schedule',bullets:[quotation.delivery_terms]},
 {number:4,title:'Pricing & Packing',bullets:[`Packing and forwarding: ${quotation.currency} ${quotation.packaging_charges.toFixed(2)}`]},
 {number:5,title:'Freight and Transit',bullets:[quotation.freight_terms,`Freight charge: ${quotation.currency} ${quotation.freight_charges.toFixed(2)}`]},
 {number:6,title:'Insurance',bullets:[`Transit insurance: ${quotation.currency} ${quotation.insurance_charges.toFixed(2)}`]},
 {number:7,title:'Payment Terms',bullets:[quotation.payment_terms]},
 {number:8,title:'Warranty',bullets:[quotation.warranty_terms]},
 {number:9,title:'Additional Notes',bullets:[quotation.notes||'']}
];

export function quotationTermSections(quotation:Quotation):QuotationTermSection[]{
 const sections=quotation.quotation_type==='export'?exportSections(quotation):quotation.company_snapshot.terms_template_version===STANDARD_TERMS_VERSION?standardSections(quotation):legacySections(quotation);
 const cleaned=sections.map(section=>({...section,bullets:section.bullets.map(value=>value.trim()).filter(Boolean)})).filter(section=>section.bullets.length);
 const lastNumber=cleaned.reduce((maximum,section)=>Math.max(maximum,section.number),0);
 const custom=(quotation.additional_clauses||[]).map((clause,index)=>({
  number:lastNumber+index+1,
  title:clause.title.trim(),
  bullets:clause.text.split(/\r?\n/).map(value=>value.replace(/^\s*[•*-]\s*/, '').trim()).filter(Boolean)
 })).filter(section=>section.title&&section.bullets.length);
 return [...cleaned,...custom];
}
