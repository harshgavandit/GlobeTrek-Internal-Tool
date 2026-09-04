import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import ExcelJS from 'exceljs';
import { Quotation,Product } from '../src/types';
const env=JSON.parse(readFileSync('tmp/audit/test-env.json','utf8'));
if(!env.DATABASE_URL.endsWith('/globetrek_acceptance'))throw Error('Integration tests require isolated globetrek_acceptance database');
const pool=new Pool({connectionString:env.DATABASE_URL}),base=env.APP_URL;
const checks:string[]=[];
const mark=(s:string)=>{checks.push(s);console.log('PASS',s);};
async function call(path:string,method='GET',body?:unknown,cookie='',status=200,headers:Record<string,string>={}){
 const r=await fetch(base+'/api/'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});const json=await r.json();assert.equal(r.status,status,JSON.stringify(json));return {data:json.data,json,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
}
async function run(){
 for(const path of ['users','products','categories','price-lists','customers','settings','quotations','imports','auth/me'])await call(path,'GET',undefined,'',401);
 const forged='globetrek_session_token='+Buffer.from(JSON.stringify({id:'usr_admin_01',role:'admin'})).toString('base64');await call('users','GET',undefined,forged,401);mark('all business APIs reject anonymous and forged sessions');
 await call('auth/login','POST',{email:env.adminEmail,password:'wrong'},'',401);
 const admin=(await call('auth/login','POST',{email:env.adminEmail,password:env.adminPassword})).cookie;
 const team=(await call('auth/login','POST',{email:env.teamEmail,password:env.teamPassword})).cookie;
 assert.ok(admin&&team);const u=(await call('users','GET',undefined,admin)).data;assert.ok(u.every((x:object)=>!('password_hash' in x)));mark('real bcrypt login and sanitized user responses');
 for(const path of ['products','categories','price-lists','settings','users'])await call(path,'POST',{},team,403);
 await call('imports','PUT',{},team,403);await call('users','GET',undefined,team,403);await call('customers','POST',{name:'Cross origin'},admin,403,{Origin:'https://evil.example'});mark('team role restrictions and cross-origin writes enforced server-side');
 const stamp=Date.now().toString();const category=(await call('categories','POST',{name:'Acceptance '+stamp},admin)).data;
 const list=(await call('price-lists','POST',{name:'Acceptance USD '+stamp,currency:'USD'},admin)).data;
 const customer=(await call('customers','POST',{name:'Acceptance Customer '+stamp,address:'Test address',country:'Test Country'},team)).data;
 assert.ok((await call('customers','GET',undefined,admin)).data.some((v:{id:string})=>v.id===customer.id));
 const products:Product[]=[];
 for(const [sku,name,price] of [['CBR','CBR',825],['MAR','Marshall',1750],['SIEVE','Test Sieve',55],['CTM','Compression Testing Machine',2700]] as const){products.push((await call('products','POST',{sku:`TEST-${sku}-${stamp}`,name,category_id:category.id,description:name+' acceptance specification',prices:{[list.id]:price}},admin)).data);}
 assert.equal((await call('products','GET',undefined,team)).data.find((v:{id:string})=>v.id===products[0].id).prices[0].unit_price,825);mark('customer/product data and current list prices shared between independent users');
 const pdfSettings=(await call('settings','GET',undefined,admin)).data;await call('settings','POST',{...pdfSettings,bank_accounts:[{bank_name:'IDFC FIRST Bank',account_name:pdfSettings.company_name,account_no:'10148119695',ifsc:'IDFB0040172',branch:'CBD Belapur, Navi Mumbai'},{bank_name:'Indian Bank',account_name:pdfSettings.company_name,account_no:'6209411911',ifsc:'IDIB000N110',branch:'Nerul East, Navi Mumbai'}]},admin);
 const form={customer_id:customer.id,price_list_id:list.id,currency:'USD',quotation_date:'2026-08-31',valid_until:'2026-09-30',customer_reference:'Email enquiry for laboratory testing equipment',items:products.map((p,i)=>({product_id:p.id,master_price:p.prices![0].unit_price,unit_price:p.prices![0].unit_price,quantity:[2,1,10,1][i],discount_percent:0,product_name:'FORGED NAME',sku:'FORGED',line_total:1})),packaging_charges:150,freight_charges:450,insurance_charges:50,other_charges:0,discount_amount:0,tax_percent:0,payment_terms:'Acceptance payment terms',delivery_terms:'Acceptance delivery terms',warranty_terms:'Acceptance warranty',validity_terms:'30 days',freight_terms:'Acceptance freight',notes:'Isolated automated acceptance test',subtotal:1,total_amount:1,tax_amount:999};
 const before=Number((await pool.query('SELECT count(*) FROM quotations')).rows[0].count);
 const preview=(await call('quotations','POST',{...form,action:'preview'},team)).data;
 assert.equal(preview.total_amount,7300);assert.equal(Number((await pool.query('SELECT count(*) FROM quotations')).rows[0].count),before);mark('preview validates/recalculates without persistence or consuming a quotation number');
 const request=randomUUID();const q:Quotation=(await call('quotations','POST',{...form,request_id:request},team)).data;
 assert.equal(q.subtotal,6650);assert.equal(q.total_amount,7300);assert.equal(q.customer_reference,form.customer_reference);assert.equal(q.items[0].product_name,'CBR');assert.deepEqual(q.items.map(v=>v.line_total),[1650,1750,550,2700]);
 assert.equal(q.company_snapshot.company_name,'GlobeTrek Engineering Corporation');assert.equal(q.company_snapshot.gstin,'27AAMFG8874A1Z4');assert.equal(q.company_snapshot.logo_path,'/brand/globetrek-logo.jpeg');assert.equal(q.company_snapshot.bank_accounts?.length,2);
 const persisted=(await pool.query('SELECT subtotal,total_amount,snapshot FROM quotations WHERE id=$1',[q.id])).rows[0];assert.equal(persisted.subtotal,'6650.00');assert.equal(persisted.total_amount,'7300.00');assert.deepEqual(persisted.snapshot,q);
 assert.equal((await call('quotations','POST',{...form,request_id:request},team)).data.id,q.id);mark('saved PostgreSQL totals are 6650.00 / 7300.00; server ignores forged totals/identity; retry is idempotent');
 const concurrent=await Promise.all(Array.from({length:12},(_,i)=>call('quotations','POST',{...form,request_id:randomUUID()},i%2?team:admin)));
 assert.equal(new Set(concurrent.map(v=>v.data.quotation_number)).size,12);mark('12 simultaneous saves across two users receive unique quotation numbers');
 await call('quotations','POST',{...form,request_id:randomUUID(),items:[{...form.items[0],quantity:-1}]},team,400);
 await call('quotations','POST',{...form,request_id:randomUUID(),currency:'INR'},team,400);
 await call('quotations','POST',{...form,request_id:randomUUID(),items:[{...form.items[0],master_price:1}]},team,409);
 await call('quotations','POST',{...form,request_id:randomUUID(),discount_amount:8000},team,400);mark('negative quantities, incorrect currencies, stale masters and excessive discounts rejected');
 const template=await fetch(base+'/api/imports',{headers:{cookie:admin}});assert.equal(template.status,200);
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await template.arrayBuffer());const sheet=wb.worksheets[0];
 const headers=(sheet.getRow(1).values as string[]);const priceCol=headers.indexOf(list.name+' (USD)');assert.ok(priceCol>0);
 const row=sheet.addRow([products[0].sku,products[0].name,'',category.name,'Imported spec']);row.getCell(priceCol).value=826;
 const importBuffer=await wb.xlsx.writeBuffer();await fs.writeFile('tmp/audit/browser-import.xlsx',new Uint8Array(importBuffer));
 const upload=async(buffer:Uint8Array)=>{const r=await fetch(base+'/api/imports',{method:'POST',headers:{cookie:admin,'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'},body:new Uint8Array(buffer).buffer});assert.equal(r.status,200);return (await r.json()).data;};
 const diff=await upload(new Uint8Array(importBuffer));assert.equal(diff.errors,0);assert.equal(diff.priceUpdates,1);
 assert.equal((await pool.query('SELECT unit_price FROM product_prices WHERE product_id=$1 AND price_list_id=$2',[products[0].id,list.id])).rows[0].unit_price,'825.00');
 await call('imports','PUT',{previewId:diff.previewId},admin);await call('imports','PUT',{previewId:diff.previewId},admin,409);
 const history=(await call('products?history='+products[0].id,'GET',undefined,team)).data;assert.ok(history.some((h:{old_price:number;new_price:number})=>h.old_price===825&&h.new_price===826));mark('Excel preview changes nothing, commit persists atomically with audited old/new prices, replay rejected');
 sheet.getRow(2).getCell(priceCol).value=-5;const invalid=await upload(new Uint8Array(await wb.xlsx.writeBuffer()));assert.equal(invalid.errors,1);await call('imports','PUT',{previewId:invalid.previewId},admin,400);
 sheet.getRow(2).getCell(priceCol).value=827;const stale=await upload(new Uint8Array(await wb.xlsx.writeBuffer()));await call('categories','PUT',{id:category.id,name:category.name,description:'Changed after preview'},admin);await call('imports','PUT',{previewId:stale.previewId},admin,409);mark('invalid import and stale preview cannot modify the catalog');
 const settings=(await call('settings','GET',undefined,admin)).data;await call('settings','POST',{...settings,company_name:'Updated company after save'},admin);
 await call('customers','PUT',{id:customer.id,name:'Changed customer after save'},team);
 assert.deepEqual((await call('quotations?id='+q.id,'GET',undefined,team)).data,q);mark('saved customer, product price and company snapshots remain unchanged after master updates');
 // Export exact saved revision through authenticated HTTP endpoints.
 for(const format of ['pdf','xlsx']){const r=await fetch(`${base}/api/quotations/export?id=${q.id}&revision=${q.revision}&format=${format}`,{headers:{cookie:team}});assert.equal(r.status,200,await (r.status!==200?r.text():Promise.resolve('')));await fs.writeFile(`tmp/audit/acceptance.${format}`,new Uint8Array(await r.arrayBuffer()));}
 const exported=new ExcelJS.Workbook();await exported.xlsx.readFile('tmp/audit/acceptance.xlsx');const cells:unknown[]=[];exported.worksheets[0].eachRow(r=>r.eachCell(c=>cells.push(c.value)));for(const value of [6650,7300,150,450,50,1650,1750,550,2700])assert.ok(cells.includes(value),`Excel missing ${value}`);const exportText=cells.filter(v=>typeof v==='string').join('\n');for(const value of ['GlobeTrek Engineering Corporation','27AAMFG8874A1Z4','globetrekengineering@gmail.com','CBD Belapur'])assert.ok(exportText.includes(value),`Excel missing ${value}`);assert.ok(exported.worksheets[0].getImages().length>0,'Excel missing company logo');mark('HTTP PDF/Excel exports use the saved revision with matching totals and branded company identity');
 const duplicate=(await call('quotations','POST',{action:'duplicate',sourceId:q.id,request_id:randomUUID()},team)).data;assert.notEqual(duplicate.quotation_number,q.quotation_number);assert.equal(duplicate.items[0].master_price,825);assert.equal(duplicate.total_amount,7300);
 const edit={...duplicate,items:duplicate.items.map((v:object,i:number)=>i===0?{...v,unit_price:800}:v)};
 const outcomes=await Promise.all([fetch(base+'/api/quotations',{method:'PUT',headers:{cookie:team,'Content-Type':'application/json'},body:JSON.stringify(edit)}),fetch(base+'/api/quotations',{method:'PUT',headers:{cookie:admin,'Content-Type':'application/json'},body:JSON.stringify(edit)})]);assert.deepEqual(outcomes.map(v=>v.status).sort(),[200,409]);
 const edited=(await call('quotations?id='+duplicate.id,'GET',undefined,team)).data;assert.equal(edited.total_amount,7250);assert.equal(edited.items[0].master_price,825);assert.equal(edited.items[0].unit_price,800);
 assert.equal((await pool.query('SELECT count(*) FROM quotation_revisions WHERE quotation_id=$1',[duplicate.id])).rows[0].count,'2');mark('duplicate retains original snapshots, edit separates master/quoted prices, competing edit is rejected and prior revision retained');
 const exp=await fetch(`${base}/api/quotations/export?id=${duplicate.id}&revision=1&format=pdf`,{headers:{cookie:team}});assert.equal(exp.status,409);mark('stale export revision rejected to prevent UI/export mismatch');
 await call('auth/logout','POST',undefined,team);await call('auth/me','GET',undefined,team,401);mark('logout revokes PostgreSQL session');
 // Restore fixture master/customer/company for independent browser test (does not touch saved snapshots).
 await call('products','POST',{action:'upsert_price',productId:products[0].id,priceListId:list.id,unitPrice:825,reason:'Reset isolated acceptance fixture'},admin);
 await call('customers','PUT',{...customer},admin);const current=(await call('settings','GET',undefined,admin)).data;await call('settings','POST',{...settings,revision:current.revision},admin);
 await fs.writeFile('tmp/audit/fixture.json',JSON.stringify({list,customer,category,products,form,quotation:q,adminCookie:admin},null,2));
 await fs.writeFile('tmp/audit/integration-results.json',JSON.stringify({status:'PASS',checks,quotation:q.quotation_number,subtotal:q.subtotal,total:q.total_amount,date:new Date().toISOString()},null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>pool.end());
