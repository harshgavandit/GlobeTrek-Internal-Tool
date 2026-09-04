import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateLineItemTotal,recalculateQuotation} from '../src/lib/quotation-calculator';
import {quoteFormSchema,money,userSchema} from '../src/lib/validation';
import {QuotationFormState} from '../src/types';
import {businessDate} from '../src/lib/business-date';
const form={items:[{unit_price:825,quantity:2,discount_percent:0},{unit_price:1750,quantity:1,discount_percent:0},{unit_price:55,quantity:10,discount_percent:0},{unit_price:2700,quantity:1,discount_percent:0}],packaging_charges:150,freight_charges:450,insurance_charges:50,other_charges:0,discount_amount:0,tax_percent:0} as QuotationFormState;
test('required acceptance calculation is exactly 6650 / 7300',()=>{const q=recalculateQuotation(form);assert.deepEqual(q.items.map(i=>i.line_total),[1650,1750,550,2700]);assert.equal(q.subtotal,6650);assert.equal(q.total_amount,7300);});
test('decimal round half up, fractional quantity and discount',()=>{assert.equal(calculateLineItemTotal(0.1,3),0.3);assert.equal(calculateLineItemTotal(0.05,1,10),0.05);assert.equal(calculateLineItemTotal(19.99,1.5,7.5),27.74);});
test('tax includes charges and deducts explicit discount',()=>{const q=recalculateQuotation({...form,discount_amount:300,tax_percent:18});assert.equal(q.tax_amount,1260);assert.equal(q.total_amount,8260);});
test('invalid monetary inputs and weak passwords rejected',()=>{for(const v of [-1,NaN,Infinity,0.001,'12'])assert.equal(money.safeParse(v).success,false);assert.equal(userSchema.safeParse({full_name:'A',email:'a@example.test',role:'admin',password:'short'}).success,false);});
test('quotation validation rejects missing references, no items, and impossible dates',()=>{assert.equal(quoteFormSchema.safeParse(form).success,false);assert.equal(quoteFormSchema.safeParse({...form,items:[]}).success,false);});

import {numberToWords} from '../src/lib/number-to-words';
test('amount in words preserves subunits below one',()=>{assert.equal(numberToWords(0.5,'USD'),'Zero US Dollars and Fifty Cents Only');assert.ok(!numberToWords(12000000000,'INR').includes('undefined'));});
test('quotation dates use India midnight consistently on client and server',()=>{assert.equal(businessDate(0,new Date('2026-08-31T20:00:00Z')),'2026-09-01');assert.equal(businessDate(30,new Date('2026-08-31T20:00:00Z')),'2026-10-01');});
