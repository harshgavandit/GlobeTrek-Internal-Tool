import assert from 'node:assert/strict';
import test from 'node:test';
import { quotationEnquiryReference } from '../src/lib/quotation-reference';
import { quoteFormSchema } from '../src/lib/validation';
const number='GTEC/QTN/2026-27/0005';
test('enquiry date uses the exact weekday/date format independently of local timezone',()=>{
 assert.equal(quotationEnquiryReference({quotation_number:number,customer_reference:' Your Email Enquiry ',customer_enquiry_date:'2026-04-14'}),'Your Email Enquiry Dt. Tuesday, April 14, 2026');
 assert.equal(quotationEnquiryReference({quotation_number:number,customer_enquiry_date:'2024-02-29'}),'Your Email Enquiry Dt. Thursday, February 29, 2024');
});
test('legacy references and empty enquiry fields keep their existing meaning',()=>{
 assert.equal(quotationEnquiryReference({quotation_number:number,customer_reference:'RFQ-123'}),'RFQ-123');
 assert.equal(quotationEnquiryReference({quotation_number:number,customer_reference:' ',customer_enquiry_date:''}),number);
 assert.equal(quotationEnquiryReference({quotation_number:number,customer_reference:'RFQ-123',customer_enquiry_date:'bad'}),'RFQ-123');
});
const form={customer_id:'00000000-0000-4000-8000-000000000001',price_list_id:'00000000-0000-4000-8000-000000000002',currency:'INR',quotation_date:'2026-04-15',valid_until:'2026-05-15',items:[{product_id:'00000000-0000-4000-8000-000000000003',master_price:10,unit_price:10,quantity:1,discount_percent:0}],packaging_charges:0,freight_charges:0,insurance_charges:0,other_charges:0,tax_percent:0,payment_terms:'',delivery_terms:'',warranty_terms:'',validity_terms:'',freight_terms:''};
test('server accepts optional enquiry dates and rejects impossible calendar dates',()=>{
 for(const date of [undefined,'','2026-04-14','2024-02-29'])assert.ok(quoteFormSchema.safeParse({...form,customer_enquiry_date:date}).success);
 for(const date of ['2026-02-29','2026-04-31','14/04/2026','bad'])assert.equal(quoteFormSchema.safeParse({...form,customer_enquiry_date:date}).success,false);
});
test('custom reference numbers are trimmed, optional, bounded and single-line',()=>{
 assert.equal(quoteFormSchema.parse({...form,quotation_number:' CUSTOM/2026/01 '}).quotation_number,'CUSTOM/2026/01');
 assert.ok(quoteFormSchema.safeParse(form).success);
 assert.ok(quoteFormSchema.safeParse({...form,quotation_number:''}).success);
 for(const value of ['x'.repeat(101),'CUSTOM\nNUMBER','CUSTOM\tNUMBER'])assert.equal(quoteFormSchema.safeParse({...form,quotation_number:value}).success,false);
});
