import ExcelJS from 'exceljs';
import { inflateRawSync } from 'node:zlib';
import { catalogLock, transaction } from './db/pool';
import { catalogFingerprint, serverDb } from './db/postgres';
import { AppError, money, productSchema } from './validation';
import { ImportDiffItem, ImportDiffsSummary } from './excel-importer';
import { productDescriptionDetail } from './product-description';

// Bound actual decompression before ExcelJS parses workbook XML. Declared ZIP
// sizes alone can be forged, so each entry is inflated with a hard output limit.
export function validateZip(buffer:Buffer){
 if(buffer.length>5*1024*1024)throw new AppError(413,'Maximum workbook size is 5 MB');
 try {
  let end=buffer.length-22;
  while(end>=Math.max(0,buffer.length-65557)&&buffer.readUInt32LE(end)!==0x06054b50)end--;
  if(end<0||buffer.readUInt32LE(end)!==0x06054b50||end+22+buffer.readUInt16LE(end+20)!==buffer.length)throw Error();
  const entries=buffer.readUInt16LE(end+10);let cursor=buffer.readUInt32LE(end+16),expanded=0;
  if(buffer.readUInt32LE(end+4)!==0||!entries||entries>1000||cursor+buffer.readUInt32LE(end+12)!==end)throw Error();
  for(let i=0;i<entries;i++){
   if(buffer.readUInt32LE(cursor)!==0x02014b50)throw Error();
   const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10),size=buffer.readUInt32LE(cursor+20),declared=buffer.readUInt32LE(cursor+24),offset=buffer.readUInt32LE(cursor+42);
   if(flags&1||![0,8].includes(method)||declared>30*1024*1024-expanded||buffer.readUInt32LE(offset)!==0x04034b50)throw Error();
   const start=offset+30+buffer.readUInt16LE(offset+26)+buffer.readUInt16LE(offset+28);
   if(start+size>buffer.readUInt32LE(end+16))throw Error();
   const data=buffer.subarray(start,start+size),actual=method===0?data:inflateRawSync(data,{maxOutputLength:Math.max(1,30*1024*1024-expanded)});
   if(actual.length!==declared)throw Error();expanded+=actual.length;if(expanded>30*1024*1024)throw Error();
   cursor+=46+buffer.readUInt16LE(cursor+28)+buffer.readUInt16LE(cursor+30)+buffer.readUInt16LE(cursor+32);
  }
  if(cursor!==end)throw Error();
 }catch{throw new AppError(400,'Invalid, encrypted or excessively expanded workbook');}
}
export async function previewImport(buffer:Buffer,actor:string):Promise<ImportDiffsSummary>{
 validateZip(buffer);const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(buffer as unknown as ArrayBuffer);}catch{throw new AppError(400,'Workbook could not be read. Upload an unencrypted .xlsx file.');}
 if(workbook.worksheets.length!==1)throw new AppError(400,'Import must contain exactly one worksheet');
 const sheet=workbook.worksheets[0];if(sheet.rowCount>2001||sheet.columnCount>50)throw new AppError(400,'Maximum import is 2000 rows and 50 columns');
 return transaction(async c=>{
  await catalogLock(c);const products=await serverDb.getProducts(c),lists=await serverDb.getPriceLists(c),cats=await serverDb.getCategories(c);
  const headers:string[]=[];sheet.getRow(1).eachCell((cell,col)=>{if(typeof cell.value!=='string')throw new AppError(400,'Headers must be text');headers[col]=cell.value.trim();});
  const skuCol=headers.indexOf('SKU'),nameCol=headers.indexOf('Product Name');
  if(skuCol<1||nameCol<1)throw new AppError(400,'First row must contain SKU and Product Name. Download the current template.');
  if(new Set(headers.filter(Boolean)).size!==headers.filter(Boolean).length)throw new AppError(400,'Duplicate column headers');
  const fields:Record<string,string>={'SKU':'sku','Product Name':'name','Model No':'model_number','Category':'category','Description':'description'};
  const priceCols=new Map<number,string>();
  headers.forEach((h,i)=>{if(fields[h])return;const matches=lists.filter(l=>l.is_active&&h===`${l.name} (${l.currency})`);if(matches.length!==1)throw new AppError(400,`Unrecognized price column: ${h}. Use an exact active price list name and currency.`);priceCols.set(i,matches[0].id);});
  const seen=new Set<string>();const items:ImportDiffItem[]=[];
  sheet.eachRow((row,n)=>{if(n===1)return;
   const item:ImportDiffItem={rowNumber:n,sku:'',name:'',action:'unchanged',changes:[],prices:{}};
   try{
    for(const [i,h] of headers.entries()){if(!h)continue;const v=row.getCell(i).value;if(v===null||v===undefined||v==='')continue;
     if(typeof v!=='string'&&typeof v!=='number')throw new Error('Formula, hyperlink and rich-text cells are not allowed');
     if(priceCols.has(i)){if(typeof v!=='number')throw new Error(`Price in ${h} must be a numeric cell`);item.prices[priceCols.get(i)!]=money.parse(v);}
     else Object.assign(item,{[fields[h]]:String(v).trim()});
    }
    item.description=productDescriptionDetail(item.name,item.description);productSchema.parse(item);const key=item.sku.toLowerCase();if(seen.has(key))throw new Error('Duplicate SKU in workbook');seen.add(key);
    const old=products.find(p=>p.sku.toLowerCase()===key);
    if(old&&!old.is_active)throw new Error('Product is inactive; reactivate it before importing');
    if(item.category&&!cats.some(cat=>cat.name.toLowerCase()===item.category!.toLowerCase()))item.changes.push(`Create category: ${item.category}`);
    if(!old){item.action='new';item.changes.push('Create product');}
    else {
     for(const field of ['name','model_number','description'] as const)if(item[field]!==undefined&&item[field]!==old[field])item.changes.push(`${field}: ${old[field]||'(empty)'} -> ${item[field]}`);
     if(item.category&&item.category!==old.category?.name)item.changes.push(`Category: ${old.category?.name||'(empty)'} -> ${item.category}`);
     item.action=item.changes.length?'details_update':'unchanged';
    }
    for(const [list,price] of Object.entries(item.prices)){const prior=old?.prices?.find(p=>p.price_list_id===list);if(!prior||prior.unit_price!==price){item.changes.push(`${lists.find(l=>l.id===list)?.name}: ${prior?.unit_price??'(not set)'} -> ${price}`);if(old)item.action='price_update';}}
   }catch(e){item.action='error';item.errorMessage=e instanceof Error?e.message:'Invalid row';}
   items.push(item);
  });
  if(!items.length)throw new AppError(400,'Workbook contains no product rows');
  const summary:ImportDiffsSummary={totalRows:items.length,newProducts:items.filter(i=>i.action==='new').length,priceUpdates:items.filter(i=>i.action==='price_update').length,detailUpdates:items.filter(i=>i.action==='details_update').length,unchanged:items.filter(i=>i.action==='unchanged').length,errors:items.filter(i=>i.action==='error').length,items};
  const r=(await c.query('INSERT INTO import_previews(user_id,payload,baseline) VALUES($1,$2,$3) RETURNING id',[actor,JSON.stringify(summary),await catalogFingerprint(c)])).rows[0];
  return {...summary,previewId:r.id};
 });
}
export async function commitImport(id:string,actor:string){return transaction(async c=>{
 await catalogLock(c);const r=(await c.query('SELECT * FROM import_previews WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,actor])).rows[0];
 if(!r)throw new AppError(404,'Import preview not found');if(r.committed_at)throw new AppError(409,'Import already committed');if(new Date(r.expires_at)<new Date())throw new AppError(409,'Preview expired; upload again');
 const summary=r.payload as ImportDiffsSummary;if(summary.errors)throw new AppError(400,'Correct all invalid rows before committing');
 if(r.baseline!==await catalogFingerprint(c))throw new AppError(409,'Catalog changed after preview. Upload again to review current changes.');
 const products=await serverDb.getProducts(c);const cats=await serverDb.getCategories(c);
 for(const item of summary.items){if(item.action==='unchanged')continue;let category=cats.find(v=>v.name.toLowerCase()===item.category?.toLowerCase());if(item.category&&!category){category=(await c.query('INSERT INTO categories(name) VALUES($1) RETURNING *',[item.category])).rows[0];cats.push(category!);}
  const old=products.find(p=>p.sku.toLowerCase()===item.sku.toLowerCase());
  await serverDb.writeProduct(c,old?.id,{...old,...item,category_id:category?.id??old?.category_id},item.prices,actor,`Excel import ${id}; row ${item.rowNumber}`);
 }
 await c.query('UPDATE import_previews SET committed_at=now() WHERE id=$1',[id]);return {newCount:summary.newProducts,updatedCount:summary.priceUpdates+summary.detailUpdates};
});}
export async function importTemplate(){const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Product Prices');const lists=await serverDb.getPriceLists();sheet.columns=['SKU','Product Name','Model No','Category','Description',...lists.filter(l=>l.is_active).map(l=>`${l.name} (${l.currency})`)].map(header=>({header,width:header==='Description'?60:30}));sheet.getRow(1).font={bold:true};return workbook.xlsx.writeBuffer();}
