import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash,randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
const e=JSON.parse(readFileSync('tmp/audit/test-env.json','utf8'));
if(new URL(e.DATABASE_URL).pathname!=='/globetrek_acceptance')throw Error('Isolated acceptance database required');
const p=new Pool({connectionString:e.DATABASE_URL}),checks:string[]=[];
const pass=(s:string)=>{checks.push(s);console.log('PASS',s);};
async function api(path:string,method='GET',body?:unknown,cookie='',status=200){const r=await fetch(e.APP_URL+'/api/'+path,{method,headers:{cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const j=await r.json();assert.equal(r.status,status,j.error);return {data:j.data,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
async function run(){
 const admin=(await api('auth/login','POST',{email:e.adminEmail,password:e.adminPassword})).cookie;
 await api('customers','POST',null,admin,400);await api('customers','POST',[],admin,400);await api('customers','POST',{name:'a'.repeat(1000001)},admin,413);
 await api('users','POST',{email:'utf8@example.test',full_name:'UTF8',role:'team_member',password:'😀'.repeat(30)},admin,400);pass('malformed objects, oversized JSON and overlong UTF-8 passwords rejected');
 const email=`expired-${randomUUID()}@example.test`,password=randomBytes(24).toString('hex');
 const user=(await api('users','POST',{email,password,full_name:'Disposable session regression',role:'team_member'},admin)).data;
 let session=(await api('auth/login','POST',{email,password})).cookie;
 await p.query('UPDATE sessions SET expires_at=now()-interval \'1 second\' WHERE token_hash=$1',[createHash('sha256').update(session.split('=')[1]).digest('hex')]);await api('auth/me','GET',undefined,session,401);
 session=(await api('auth/login','POST',{email,password})).cookie;await api('users?id='+user.id,'DELETE',undefined,admin);await api('auth/me','GET',undefined,session,401);pass('expired sessions and deactivated accounts lose API access immediately');
 const wrong=`rate-${randomUUID()}@example.test`;for(let n=0;n<10;n++)await api('auth/login','POST',{email:wrong,password:'incorrect'},'',401);await api('auth/login','POST',{email:wrong,password:'incorrect'},'',429);pass('PostgreSQL login throttle rejects the eleventh attempt');
 const fixture=JSON.parse(await fs.readFile('tmp/audit/fixture.json','utf8'));
 const text='Calibration ± 0.01 μm; temperature 20 °C; force ≥ 10 N. '.repeat(85)+'END-DESCRIPTION';
 const prod=(await api('products','POST',{sku:'EXPORT-'+randomUUID(),name:'Unicode export validation',model_number:'GT-401 Δ',description:text,prices:{[fixture.list.id]:10.01}},admin)).data;
 const writes=await Promise.all(['First editor','Second editor'].map(name=>fetch(e.APP_URL+'/api/products',{method:'PUT',headers:{cookie:admin,'Content-Type':'application/json'},body:JSON.stringify({...prod,name,prices:{},expected_updated_at:prod.updated_at})})));
 assert.deepEqual(writes.map(r=>r.status).sort(),[200,409]);pass('competing Product Master edits reject the stale version');
 const q=(await api('quotations','POST',{...fixture.form,items:[{product_id:prod.id,master_price:10.01,unit_price:10.01,quantity:0.125,discount_percent:0,description:text}],packaging_charges:0.01,freight_charges:0.02,insurance_charges:0.03,other_charges:0.04,discount_amount:0.05,tax_percent:18,notes:'Detailed saved notes. '.repeat(180)+'END-NOTES',request_id:randomUUID()},admin)).data;
 assert.equal(q.subtotal,1.25);assert.equal(q.tax_amount,0.23);assert.equal(q.total_amount,1.53);
 for(const format of ['pdf','xlsx']){const r=await fetch(`${e.APP_URL}/api/quotations/export?id=${q.id}&revision=1&format=${format}`,{headers:{cookie:admin}});assert.equal(r.status,200);await fs.writeFile(`tmp/audit/long-unicode.${format}`,new Uint8Array(await r.arrayBuffer()));}
 const w=new ExcelJS.Workbook();await w.xlsx.readFile('tmp/audit/long-unicode.xlsx');const strings:string[]=[];w.worksheets[0].eachRow(row=>{assert.ok((row.height||0)<=409);row.eachCell(cell=>{assert.notEqual(cell.type,ExcelJS.ValueType.Formula);if(typeof cell.value==='string')strings.push(cell.value);});});
 const combined=strings.join('').replace(/\s/g,'');for(const str of ['END-DESCRIPTION','END-NOTES','GT-401 Δ','μm','≥'])assert.ok(combined.includes(str.replace(/\s/g,'')),str);pass('fractional decimal calculation and long Unicode saved exports preserve model, text and numeric cells');
 await fs.writeFile('tmp/audit/extended-results.json',JSON.stringify({status:'PASS',checks,quotation:q.quotation_number,total:q.total_amount,date:new Date().toISOString()},null,2));
}
run().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>p.end());
