import {loadEnvConfig} from '@next/env';
import fs from 'node:fs/promises';
import {getPool,transaction,catalogLock} from '../src/lib/db/pool';
import {serverDb} from '../src/lib/db/postgres';
loadEnvConfig(process.cwd());
async function main(){const source=JSON.parse(await fs.readFile('database/gtec-price-list-2022-23.json','utf8'));const admin=await serverDb.getUserByEmail(process.env.ADMIN_EMAIL||'');if(!admin||admin.role!=='admin')throw new Error('Set ADMIN_EMAIL to an existing administrator for the import audit trail');
await transaction(async c=>{await catalogLock(c);let list=(await c.query('SELECT id FROM price_lists WHERE name=$1',[source.price_list])).rows[0];if(!list)list=(await c.query('INSERT INTO price_lists(name,currency,description) VALUES($1,$2,$3) RETURNING id',[source.price_list,source.currency,source.basis])).rows[0];
const existing=await serverDb.getProducts(c);const categories=await serverDb.getCategories(c);
for(const p of source.products){let cat=categories.find(v=>v.name===p.category);if(!cat){cat=(await c.query('INSERT INTO categories(name) VALUES($1) RETURNING *',[p.category])).rows[0];categories.push(cat!);}const prior=existing.find(v=>v.sku===p.sku);const provenance=`Source: ${source.source_file}; page ${p.source_page}; printed code ${p.source_code}. ${p.mapping_note}`;await serverDb.writeProduct(c,prior?.id,{...prior,sku:p.sku,name:p.name,description:p.description,specifications:provenance,category_id:cat!.id},{[list.id]:p.unit_price},admin.id,provenance);}
console.log(`Imported ${source.products.length} verified source rows to INR list ${source.price_list}. Blank prices were not converted to zero.`);
for(const p of source.unpriced){const prior=existing.find(v=>v.sku===p.code);await serverDb.writeProduct(c,prior?.id,{...prior,sku:p.code,name:'Calibration service (price on request)',description:p.description,specifications:`Source: ${source.source_file}; page ${p.page}. ${p.reason}`},{},admin.id,'Source service without a published price');}
});}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>getPool().end());
