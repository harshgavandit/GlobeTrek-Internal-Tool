import {loadEnvConfig} from '@next/env';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {getPool} from '../src/lib/db/pool';
loadEnvConfig(process.cwd());
async function run(){
 const source=JSON.parse(await fs.readFile('database/gtec-price-list-2022-23.json','utf8'));
 const rows=(await getPool().query('SELECT p.sku,p.name,p.data,v.unit_price,l.currency FROM product_prices v JOIN products p ON p.id=v.product_id JOIN price_lists l ON l.id=v.price_list_id WHERE l.name=$1',[source.price_list])).rows;
 assert.equal(rows.length,source.products.length);
 for(const p of source.products){const row=rows.find(v=>v.sku===p.sku);assert.ok(row,p.sku);assert.equal(row.name,p.name.trim());assert.equal(Number(row.unit_price),p.unit_price,p.sku);assert.equal(row.currency,'INR');assert.equal(row.data.description,p.description);}
 const unpriced=await getPool().query('SELECT p.sku FROM products p LEFT JOIN product_prices v ON v.product_id=p.id WHERE p.sku=$1 AND v.id IS NULL',['GT-130']);assert.equal(unpriced.rowCount,1);
 const summary={status:'PASS',pricedVariants:rows.length,unpricedServices:1,currency:'INR',sumOfUnitPrices:rows.reduce((n,r)=>n+Number(r.unit_price),0),source:source.source_file,sha256:source.sha256,date:new Date().toISOString()};
 await fs.mkdir('tmp/audit',{recursive:true});await fs.writeFile('tmp/audit/catalog-verification.json',JSON.stringify(summary,null,2));console.log(summary);
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>getPool().end());
