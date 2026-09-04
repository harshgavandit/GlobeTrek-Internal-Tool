import { PoolClient } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { getPool, transaction, catalogLock } from './pool';
import { AppError, categorySchema, priceListSchema, customerSchema, productSchema, pricesSchema, settingsSchema, quoteFormSchema } from '../validation';
import { Quotation, QuotationFormState, UserProfile, CompanySettings, Product, Category, price_lists, Customer } from '@/types';
import { recalculateQuotation } from '../quotation-calculator';
import { businessDate } from '../business-date';

const publicUser='id,email,full_name,role,created_at';
type Queryable=Pick<PoolClient,'query'>;
const normalize=(r:Record<string,unknown>)=>JSON.parse(JSON.stringify(r));
const unpack=(r:Record<string,unknown>)=>normalize({...r.data as object,...r,data:undefined});
async function required(c:Queryable,table:string,id:string){const r=(await c.query(`SELECT * FROM ${table} WHERE id=$1`,[id])).rows[0];if(!r)throw new AppError(404,'Record not found');return r;}
export async function catalogFingerprint(c:Queryable){const rows=(await c.query("SELECT jsonb_build_object('p',(SELECT jsonb_agg(p ORDER BY id) FROM products p),'v',(SELECT jsonb_agg(v ORDER BY id) FROM product_prices v),'c',(SELECT jsonb_agg(c ORDER BY id) FROM categories c),'l',(SELECT jsonb_agg(l ORDER BY id) FROM price_lists l)) AS data")).rows[0];return createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
export class ServerDatabaseManager {
 async getUsers(){return (await getPool().query(`SELECT ${publicUser} FROM users WHERE is_active ORDER BY created_at`)).rows.map(normalize);}
 async getUserByEmail(email:string){return (await getPool().query('SELECT * FROM users WHERE lower(email)=lower($1) AND is_active',[email])).rows[0];}
 async createUser(user:Omit<UserProfile,'id'|'created_at'> & {password_hash:string}){return normalize((await getPool().query(`INSERT INTO users(email,full_name,role,password_hash) VALUES($1,$2,$3,$4) RETURNING ${publicUser}`,[user.email,user.full_name,user.role,user.password_hash])).rows[0]);}
 async deleteUser(id:string,actor:string){if(id===actor)throw new AppError(409,'You cannot deactivate your own account');return transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(716240)');await required(c,'users',id);await c.query('UPDATE users SET is_active=false WHERE id=$1',[id]);await c.query('DELETE FROM sessions WHERE user_id=$1',[id]);});}
 async getCategories(c:Queryable=getPool()):Promise<Category[]>{return (await c.query('SELECT * FROM categories ORDER BY name')).rows.map(normalize);}
 async createCategory(input:unknown){const v=categorySchema.parse(input);return transaction(async c=>{await catalogLock(c);return normalize((await c.query('INSERT INTO categories(name,description) VALUES($1,$2) RETURNING *',[v.name,v.description||''])).rows[0]);});}
 async updateCategory(id:string,input:unknown){const v=categorySchema.parse(input);return transaction(async c=>{await catalogLock(c);await required(c,'categories',id);return normalize((await c.query('UPDATE categories SET name=$2,description=$3 WHERE id=$1 RETURNING *',[id,v.name,v.description||''])).rows[0]);});}
 async deleteCategory(id:string){return transaction(async c=>{await catalogLock(c);await required(c,'categories',id);await c.query('DELETE FROM categories WHERE id=$1',[id]);});}
 async getPriceLists(c:Queryable=getPool()):Promise<price_lists[]>{return (await c.query('SELECT * FROM price_lists ORDER BY name')).rows.map(normalize);}
 async createPriceList(input:unknown){const v=priceListSchema.parse(input);return transaction(async c=>{await catalogLock(c);return normalize((await c.query('INSERT INTO price_lists(name,currency,description) VALUES($1,$2,$3) RETURNING *',[v.name,v.currency,v.description||''])).rows[0]);});}
 async updatePriceList(id:string,input:unknown){const v=priceListSchema.parse(input);return transaction(async c=>{await catalogLock(c);const old=await required(c,'price_lists',id);if(old.currency!==v.currency && (await c.query('SELECT 1 FROM product_prices WHERE price_list_id=$1 LIMIT 1',[id])).rowCount)throw new AppError(409,'Create a new price list to change currency after prices have been assigned');return normalize((await c.query('UPDATE price_lists SET name=$2,currency=$3,description=$4,is_active=$5 WHERE id=$1 RETURNING *',[id,v.name,v.currency,v.description||'',v.is_active??old.is_active])).rows[0]);});}
 async deletePriceList(id:string){return transaction(async c=>{await catalogLock(c);await required(c,'price_lists',id);await c.query('UPDATE price_lists SET is_active=false WHERE id=$1',[id]);});}
 async getProducts(c:Queryable=getPool()):Promise<Product[]>{const products=await c.query('SELECT * FROM products ORDER BY sku');const prices=await c.query('SELECT p.*,l.currency FROM product_prices p JOIN price_lists l ON l.id=p.price_list_id');const categories=await this.getCategories(c);return products.rows.map(r=>({...unpack(r),category:categories.find(v=>v.id===r.category_id),prices:prices.rows.filter(v=>v.product_id===r.id).map(v=>({...normalize(v),unit_price:Number(v.unit_price)}))}));}
 async writeProduct(c:PoolClient,id:string|undefined,input:unknown,prices:unknown,actor:string,reason:string){
  const v=productSchema.parse(input), amounts=pricesSchema.parse(prices??{});const {sku,name,category_id,is_active,...data}=v;
  if(category_id)await required(c,'categories',category_id);
  let pid=id;
  if(pid){const old=await required(c,'products',pid);await c.query('UPDATE products SET sku=$2,name=$3,category_id=$4,data=$5,is_active=$6,updated_at=clock_timestamp() WHERE id=$1',[pid,sku,name,category_id||null,JSON.stringify(data),is_active??old.is_active]);}
  else pid=(await c.query('INSERT INTO products(sku,name,category_id,data) VALUES($1,$2,$3,$4) RETURNING id',[sku,name,category_id||null,JSON.stringify(data)])).rows[0].id;
  for(const [list,price] of Object.entries(amounts))await this.writePrice(c,pid!,list,price,actor,reason);
  return pid!;
 }
 async saveProduct(id:string|undefined,input:unknown,prices:unknown,actor:string,reason='Product Master update'){return transaction(async c=>{await catalogLock(c);if(id){const old=await required(c,'products',id);if((input as Record<string,unknown>).expected_updated_at!==old.updated_at.toISOString())throw new AppError(409,'Product changed or its version is missing. Reload Product Master before saving.');}const pid=await this.writeProduct(c,id,input,prices,actor,reason);return (await this.getProducts(c)).find(p=>p.id===pid)!;});}
 async deleteProduct(id:string){return transaction(async c=>{await catalogLock(c);await required(c,'products',id);await c.query('UPDATE products SET is_active=false,updated_at=clock_timestamp() WHERE id=$1',[id]);});}
 async writePrice(c:PoolClient,product:string,list:string,price:number,actor:string,reason:string){
  const p=await required(c,'products',product), l=await required(c,'price_lists',list);if(!p.is_active||!l.is_active)throw new AppError(409,'Product and price list must be active');
  const old=(await c.query('SELECT unit_price FROM product_prices WHERE product_id=$1 AND price_list_id=$2 FOR UPDATE',[product,list])).rows[0];
  if(old && Number(old.unit_price)===price)return;
  await c.query('INSERT INTO product_prices(product_id,price_list_id,unit_price) VALUES($1,$2,$3) ON CONFLICT(product_id,price_list_id) DO UPDATE SET unit_price=$3,updated_at=clock_timestamp()',[product,list,price]);
  await c.query('INSERT INTO product_price_history(product_id,price_list_id,old_price,new_price,changed_by_user_id,change_reason) VALUES($1,$2,$3,$4,$5,$6)',[product,list,old?.unit_price??null,price,actor,reason]);
  await c.query('UPDATE products SET updated_at=clock_timestamp() WHERE id=$1',[product]);
 }
 async upsertProductPrice(product:string,list:string,price:number,actor:string,reason:string){return transaction(async c=>{await catalogLock(c);await this.writePrice(c,product,list,price,actor,reason);});}
 async getProductPriceHistory(product:string){return (await getPool().query("SELECT h.*,jsonb_build_object('full_name',u.full_name) changed_by,jsonb_build_object('name',p.name,'currency',p.currency) price_list FROM product_price_history h JOIN users u ON u.id=h.changed_by_user_id JOIN price_lists p ON p.id=h.price_list_id WHERE product_id=$1 ORDER BY changed_at DESC",[product])).rows.map(r=>({...normalize(r),old_price:r.old_price===null?null:Number(r.old_price),new_price:Number(r.new_price)}));}
 async getCustomers():Promise<Customer[]>{return (await getPool().query('SELECT * FROM customers ORDER BY name')).rows.map(unpack);}
 async createCustomer(input:unknown){const {name,...data}=customerSchema.parse(input);return unpack((await getPool().query('INSERT INTO customers(name,data) VALUES($1,$2) RETURNING *',[name,JSON.stringify(data)])).rows[0]);}
 async updateCustomer(id:string,input:unknown){const {name,...data}=customerSchema.parse(input);const r=(await getPool().query('UPDATE customers SET name=$2,data=$3 WHERE id=$1 RETURNING *',[id,name,JSON.stringify(data)])).rows[0];if(!r)throw new AppError(404,'Customer not found');return unpack(r);}
 async deleteCustomer(id:string){await required(getPool(),'customers',id);await getPool().query('DELETE FROM customers WHERE id=$1',[id]);}
 async getSettings(c:Queryable=getPool()):Promise<CompanySettings>{const r=(await c.query("SELECT * FROM company_settings WHERE id='company'")).rows[0];if(!r)throw new Error('Run database migrations before starting the application');return {...r.data,revision:r.revision};}
 async saveSettings(input:unknown){const v=settingsSchema.parse(input);if(!v.revision)throw new AppError(409,'Reload settings before saving');const r=await getPool().query("UPDATE company_settings SET data=$1,revision=revision+1 WHERE id='company' AND revision=$2 RETURNING *",[JSON.stringify(v),v.revision]);if(!r.rowCount)throw new AppError(409,'Settings changed by another user. Reload and retry.');return {...r.rows[0].data,revision:r.rows[0].revision};}
 async getQuotations():Promise<Quotation[]>{return (await getPool().query('SELECT snapshot FROM quotations WHERE deleted_at IS NULL ORDER BY created_at DESC')).rows.map(r=>r.snapshot);}
 async getQuotationById(id:string,c:Queryable=getPool()):Promise<Quotation>{const r=(await c.query('SELECT snapshot FROM quotations WHERE id=$1 AND deleted_at IS NULL',[id])).rows[0];if(!r)throw new AppError(404,'Quotation not found');return r.snapshot;}
 async buildQuotation(c:PoolClient,input:unknown,actor:UserProfile,old?:Quotation,duplicate=false,preview=false):Promise<Quotation>{
  const form=quoteFormSchema.parse(input);const customer=unpack(await required(c,'customers',form.customer_id));const pl=await required(c,'price_lists',form.price_list_id);
  if(pl.currency!==form.currency)throw new AppError(400,'Quotation currency does not match the selected price list');
  if(!pl.is_active && (!old||old.price_list_id!==pl.id||duplicate))throw new AppError(409,'Price list is inactive');
  const products=await this.getProducts(c);const id=duplicate||!old?randomUUID():old.id;const now=new Date().toISOString();
  const items=form.items.map((item,index)=>{
   const retained=old?.price_list_id===form.price_list_id?old.items.find(v=>v.product_id===item.product_id):undefined;
   if(retained)return {...retained,...item,master_price:retained.master_price,id:duplicate?randomUUID():retained.id,quotation_id:id};
   const product=products.find(p=>p.id===item.product_id);const price=product?.prices?.find(p=>p.price_list_id===form.price_list_id);
   if(!product?.is_active||!price)throw new AppError(409,`Product ${index+1} has no active price in this list`);
   if(price.unit_price!==item.master_price)throw new AppError(409,`Price changed for ${product.sku}. Refresh products and review the master price.`);
   return {...item,id:randomUUID(),quotation_id:id,product_name:product.name,sku:product.sku,description:item.description??product.description,model_number:product.model_number,master_price:price.unit_price,line_total:0,created_at:now};
  });
  const calculated=recalculateQuotation({...form,items,subtotal:0,tax_amount:0,total_amount:0} as QuotationFormState);
  if(calculated.total_amount<0||calculated.total_amount>999999999999)throw new AppError(400,'Discount exceeds the chargeable amount or total is too large');
  const company=old?.company_snapshot||await this.getSettings(c);
  let numbering=old?{quotation_number:old.quotation_number,financial_year:old.financial_year,sequence_number:old.sequence_number}:{quotation_number:'PREVIEW - NOT SAVED',financial_year:'',sequence_number:0};
  if((!old||duplicate)&&!preview){const india=new Date(Date.now()+330*60000);const start=india.getUTCFullYear()-(india.getUTCMonth()<3?1:0);const fy=`${start}-${String(start+1).slice(-2)}`;const seq=(await c.query('INSERT INTO quotation_sequences VALUES($1,1) ON CONFLICT(financial_year) DO UPDATE SET sequence_number=quotation_sequences.sequence_number+1 RETURNING sequence_number',[fy])).rows[0].sequence_number;const settings=await this.getSettings(c);numbering={quotation_number:`${settings.quotation_prefix}/${fy}/${String(seq).padStart(4,'0')}`,financial_year:fy,sequence_number:seq};}
  const customerSnapshot=old && old.customer_id===customer.id ? Object.fromEntries(Object.entries(old).filter(([key])=>key.startsWith('customer_'))) : Object.fromEntries(['name','contact_person','address','city','country','email','phone','tax_number'].map(key=>['customer_'+key,customer[key]]));
  return {...calculated,...customerSnapshot,...numbering,id,discount_amount:form.discount_amount,items:calculated.items,customer_id:form.customer_id,price_list_name:old && old.price_list_id===pl.id?old.price_list_name:pl.name,company_snapshot:company,status:duplicate?'draft':old?.status||'draft',revision:duplicate?1:(old?.revision||0)+1,created_by_user_id:duplicate?actor.id:old?.created_by_user_id||actor.id,created_by_name:duplicate?actor.full_name:old?.created_by_name||actor.full_name,created_at:duplicate?now:old?.created_at||now,updated_at:now} as Quotation;
 }
 async persistQuote(c:PoolClient,q:Quotation,actor:string,requestId:string,isNew:boolean){
  if(isNew)await c.query('INSERT INTO quotations(id,quotation_number,financial_year,sequence_number,customer_id,price_list_id,created_by_user_id,request_id,status,subtotal,total_amount,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',[q.id,q.quotation_number,q.financial_year,q.sequence_number,q.customer_id,q.price_list_id,q.created_by_user_id,requestId,q.status,q.subtotal,q.total_amount,JSON.stringify(q)]);
  else {await c.query('UPDATE quotations SET customer_id=$2,price_list_id=$3,status=$4,subtotal=$5,total_amount=$6,snapshot=$7,revision=$8,updated_at=clock_timestamp() WHERE id=$1',[q.id,q.customer_id,q.price_list_id,q.status,q.subtotal,q.total_amount,JSON.stringify(q),q.revision]);await c.query('DELETE FROM quotation_items WHERE quotation_id=$1',[q.id]);}
  for(const [i,item] of q.items.entries())await c.query('INSERT INTO quotation_items(id,quotation_id,product_id,position,master_price,unit_price,quantity,discount_percent,line_total,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[item.id,q.id,item.product_id,i,item.master_price,item.unit_price,item.quantity,item.discount_percent,item.line_total,JSON.stringify(item)]);
  await c.query('INSERT INTO quotation_revisions(quotation_id,revision,snapshot,changed_by_user_id) VALUES($1,$2,$3,$4)',[q.id,q.revision,JSON.stringify(q),actor]);return q;
 }
 async createQuotation(input:unknown,actor:UserProfile,requestId:string,sourceId?:string){return transaction(async c=>{await catalogLock(c);const prior=(await c.query('SELECT snapshot FROM quotations WHERE created_by_user_id=$1 AND request_id=$2',[actor.id,requestId])).rows[0];if(prior)return prior.snapshot;
  const source=sourceId?await this.getQuotationById(sourceId,c):undefined;
  const validityDays=source?Math.max(0,Math.round((Date.parse(source.valid_until)-Date.parse(source.quotation_date))/86400000)):0;
  const form=source?{...source,quotation_date:businessDate(),valid_until:businessDate(validityDays)}:input;
  const quote=await this.buildQuotation(c,form,actor,source,!!source);return this.persistQuote(c,quote,actor.id,requestId,true);
 });}
 async previewQuotation(input:unknown,actor:UserProfile){return transaction(async c=>{await catalogLock(c);return this.buildQuotation(c,input,actor,undefined,false,true);});}
 async updateQuotation(id:string,input:Record<string,unknown>,actor:UserProfile){return transaction(async c=>{await catalogLock(c);await c.query('SELECT id FROM quotations WHERE id=$1 FOR UPDATE',[id]);const old=await this.getQuotationById(id,c);if(input.revision!==old.revision)throw new AppError(409,'Quotation changed by another user. Reload before saving.');
  const statusOnly=Object.keys(input).every(k=>['id','revision','status'].includes(k));
  let q:Quotation;
  if(statusOnly){if(!['draft','sent','accepted','rejected'].includes(String(input.status)))throw new AppError(400,'Invalid status');q={...old,status:input.status as Quotation['status'],revision:old.revision+1,updated_at:new Date().toISOString()};}
  else q=await this.buildQuotation(c,input,actor,old);
  return this.persistQuote(c,q,actor.id,randomUUID(),false);
 });}
 async deleteQuotation(id:string){await this.getQuotationById(id);await getPool().query('UPDATE quotations SET deleted_at=now() WHERE id=$1',[id]);}
}
export const serverDb=new ServerDatabaseManager();
