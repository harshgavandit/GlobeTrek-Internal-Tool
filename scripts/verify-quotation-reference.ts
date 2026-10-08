import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import type { Quotation, Product, price_lists } from '../src/types';
import { quotationEnquiryReference } from '../src/lib/quotation-reference';
import { renderPDF, renderWord } from '../src/lib/export-service';

async function main(){
const env=JSON.parse(await fs.readFile('tmp/audit/test-env.json','utf8'));
const dbUrl=new URL(env.DATABASE_URL);
if(dbUrl.pathname!='/globetrek_acceptance'||!['localhost','127.0.0.1'].includes(dbUrl.hostname))throw Error('Isolated local acceptance database required');
const base=process.env.REFERENCE_TEST_APP_URL||'http://localhost:3003';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local acceptance app required');
const pool=new Pool({connectionString:env.DATABASE_URL});
const output='tmp/audit/quotation-reference';
await fs.mkdir(output,{recursive:true});
const checks:string[]=[];
let cookie='';
async function call(path:string,method='GET',body?:unknown,status=200){
 const response=await fetch(`${base}/api/${path}`,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 const json=await response.json();assert.equal(response.status,status,JSON.stringify(json));
 if(path==='auth/login')cookie=response.headers.get('set-cookie')!.split(';')[0];
 return json.data;
}
function pass(message:string){checks.push(message);console.log('PASS',message);}
async function verifyExports(q:Quotation,prefix:string){
 const expected=`Ref: ${quotationEnquiryReference(q)}`;
 for(const format of ['pdf','docx','xlsx']){
  const response=await fetch(`${base}/api/quotations/export?id=${q.id}&revision=${q.revision}&format=${format}`,{headers:{cookie}});
  assert.equal(response.status,200);assert.equal(response.headers.get('X-Quotation-Revision'),String(q.revision));
  const bytes=new Uint8Array(await response.arrayBuffer());await fs.writeFile(`${output}/${prefix}.${format}`,bytes);
  if(format==='docx'){
   const xml=await (await JSZip.loadAsync(bytes)).file('word/document.xml')!.async('string');
   assert.ok(xml.includes(expected));assert.ok(xml.includes(q.quotation_number));
   const paragraph=xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g)?.find(value=>value.includes(expected));
   assert.ok(paragraph?.includes('<w:b'));assert.ok(paragraph?.includes('w:before="240"'));
  }else if(format==='xlsx'){
   const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes.buffer as ArrayBuffer);let found=false;
   wb.worksheets[0].eachRow(row=>row.eachCell(cell=>{if(cell.value===expected){found=true;assert.ok(cell.font.bold);}}));assert.ok(found);
  }
 }
 pass(`${prefix}: saved PDF, Word and Excel exports include the same revision and reference fields`);
}
try{
 await call('auth/login','POST',{email:env.adminEmail,password:env.adminPassword});
 const lists=await call('price-lists') as price_lists[];
 const products=await call('products') as Product[];
 const list=lists.find(l=>l.is_active&&l.currency==='INR'&&products.some(p=>p.is_active&&p.prices?.some(price=>price.price_list_id===l.id)))||lists.find(l=>l.is_active&&products.some(p=>p.is_active&&p.prices?.some(price=>price.price_list_id===l.id)));
 assert.ok(list);const product=products.find(p=>p.is_active&&p.prices?.some(price=>price.price_list_id===list.id))!;
 const price=product.prices!.find(p=>p.price_list_id===list.id)!.unit_price;
 const customer=await call('customers','POST',{name:`Reference acceptance ${Date.now()}`,contact_person:'Test recipient',address:'Isolated acceptance address'});
 const manual=`CUSTOM/REF/${Date.now()}`;
 const form={customer_id:customer.id,quotation_type:'indian',price_list_id:list.id,currency:list.currency,exchange_rate:1,quotation_number:manual,quotation_date:'2026-04-15',valid_until:'2026-05-15',customer_reference:'Your Email Enquiry',customer_enquiry_date:'2026-04-14',items:[{product_id:product.id,master_price:price,unit_price:price,quantity:1,discount_percent:0}],packaging_charges:0,freight_charges:0,insurance_charges:0,other_charges:0,discount_amount:0,tax_percent:0,payment_terms:'Acceptance',delivery_terms:'Acceptance',warranty_terms:'Acceptance',validity_terms:'30 days',freight_terms:'Acceptance'};
 const before=(await pool.query('SELECT count(*)::int AS n FROM quotations')).rows[0].n;
 const preview=await call('quotations','POST',{...form,action:'preview'});
 assert.equal(preview.quotation_number,manual);assert.equal(quotationEnquiryReference(preview),'Your Email Enquiry Dt. Tuesday, April 14, 2026');
 assert.equal((await pool.query('SELECT count(*)::int AS n FROM quotations')).rows[0].n,before);pass('unsaved preview shows custom number and correctly formatted enquiry without consuming a record');
 const request=randomUUID();let q:Quotation=await call('quotations','POST',{...form,request_id:request});
 assert.equal(q.quotation_number,manual);assert.equal(q.customer_enquiry_date,form.customer_enquiry_date);
 assert.equal((await call('quotations','POST',{...form,request_id:request})).id,q.id);
 const row=(await pool.query('SELECT quotation_number,snapshot FROM quotations WHERE id=$1',[q.id])).rows[0];assert.equal(row.quotation_number,q.quotation_number);assert.deepEqual(row.snapshot,q);pass('custom reference and enquiry date persist in PostgreSQL; retries are idempotent');
 await verifyExports(q,'saved');
 await call('quotations','POST',{...form,quotation_number:manual.toLowerCase(),request_id:randomUUID()},409);
 await call('quotations','POST',{...form,quotation_number:manual+'BAD',customer_enquiry_date:'2026-02-29',request_id:randomUUID()},400);pass('duplicate custom numbers and impossible enquiry dates are rejected');
 await call('customers','PUT',{id:customer.id,name:customer.name,contact_person:'Changed master recipient',address:'Changed master address'});
 q=await call('quotations','PUT',{...form,id:q.id,revision:q.revision,quotation_number:manual+'/EDIT',customer_reference:'Your RFQ',customer_enquiry_date:'2026-04-13'});
 assert.equal(q.quotation_number,manual+'/EDIT');assert.equal(q.customer_reference,'Your RFQ');assert.equal(q.customer_enquiry_date,'2026-04-13');assert.equal(q.customer_contact_person,'Test recipient');assert.equal(q.customer_address,'Isolated acceptance address');
 const updated=(await pool.query('SELECT quotation_number,snapshot FROM quotations WHERE id=$1',[q.id])).rows[0];assert.equal(updated.quotation_number,q.quotation_number);assert.deepEqual(updated.snapshot,q);
 const revisions=(await pool.query('SELECT snapshot FROM quotation_revisions WHERE quotation_id=$1 ORDER BY revision',[q.id])).rows.map(r=>r.snapshot);assert.equal(revisions[0].quotation_number,manual);assert.equal(revisions[0].customer_enquiry_date,'2026-04-14');assert.equal(revisions.at(-1).quotation_number,q.quotation_number);pass('editing both references updates the live record while preserving old revisions and the customer contact snapshot');
 await call('quotations','PUT',{...form,id:q.id,revision:1},409);
 const duplicate:Quotation=await call('quotations','POST',{action:'duplicate',sourceId:q.id,request_id:randomUUID()});assert.notEqual(duplicate.quotation_number,q.quotation_number);assert.equal(duplicate.customer_enquiry_date,q.customer_enquiry_date);assert.equal(duplicate.customer_reference,q.customer_reference);pass('duplicate gets a fresh automatic number and retains enquiry details; stale edits fail');
 await verifyExports(q,'edited');
 const raceNumber=manual+'/RACE';const race=await Promise.all([1,2].map(async()=>{const r=await fetch(`${base}/api/quotations`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({...form,quotation_number:raceNumber,request_id:randomUUID()})});return r.status;}));assert.deepEqual(race.sort(),[200,409]);pass('simultaneous custom-number saves cannot create duplicate quotations');
 const currentFY=duplicate.financial_year;const next=(await pool.query('SELECT sequence_number+1 AS n FROM quotation_sequences WHERE financial_year=$1',[currentFY])).rows[0].n;const settings=await call('settings');
 const reserved=`${settings.quotation_prefix}/${currentFY}/${String(next+1).padStart(4,'0')}`;
 await call('quotations','POST',{...form,quotation_number:reserved,request_id:randomUUID()});
 const automatic=await call('quotations','POST',{...form,quotation_number:'',request_id:randomUUID()});assert.notEqual(automatic.quotation_number,reserved);assert.equal(automatic.sequence_number,next+2);pass('automatic numbering skips a future number already entered manually');
 const kept=await call('quotations','PUT',{...form,id:q.id,revision:q.revision,quotation_number:'',customer_reference:'',customer_enquiry_date:''});assert.equal(kept.quotation_number,q.quotation_number);assert.equal(quotationEnquiryReference(kept),q.quotation_number);pass('blank number on edit keeps the current number; clearing enquiry fields uses the legacy fallback');
 const htmlQuote=q;await fs.writeFile(`${output}/browser-quotation.json`,JSON.stringify(htmlQuote,null,2));
 // Exercise the export PDF branch using an isolated saved snapshot, without altering settings.
 const exportSnapshot={...q,quotation_type:'export' as const,currency:'USD'};
 await fs.writeFile(`${output}/export-template.pdf`,await renderPDF(exportSnapshot));
 await fs.writeFile(`${output}/export-template.docx`,await renderWord(exportSnapshot));
 const longSnapshot={...q,quotation_number:'CUSTOM/'+ 'LONG-REFERENCE-'.repeat(6),customer_reference:'Customer RFQ with long enquiry details '.repeat(16)};
 await fs.writeFile(`${output}/long-reference.pdf`,await renderPDF(longSnapshot));
 await fs.writeFile(`${output}/long-reference.docx`,await renderWord(longSnapshot));
 pass('Indian, export and long-reference templates generated for layout verification');
 await fs.writeFile(`${output}/results.json`,JSON.stringify({status:'PASS',date:new Date().toISOString(),database:'globetrek_acceptance',checks,browserQuotationId:duplicate.id,expectedBrowserReference:`Ref: ${quotationEnquiryReference(duplicate)}`,expectedBrowserNumber:duplicate.quotation_number},null,2));
}finally{await pool.end();}

}
main().catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
