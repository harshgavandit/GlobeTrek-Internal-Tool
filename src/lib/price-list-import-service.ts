import ExcelJS from 'exceljs';
import { createHash } from 'node:crypto';
import { catalogLock, transaction } from './db/pool';
import { catalogFingerprint, serverDb } from './db/postgres';
import { AppError, money, productSchema } from './validation';
import { validateZip } from './import-service';
import { ImportDiffItem } from './excel-importer';
import { productDescriptionDetail } from './product-description';

export const MAX_PRICE_LIST_FILE_BYTES=15*1024*1024;
const MAX_PDF_PAGES=200;
const currencies=['INR','USD','EUR','GBP','AED'] as const;
export type ImportCurrency=typeof currencies[number];
export interface PriceListImportSummary {
 previewId?:string; priceListName:string; currency:ImportCurrency; description:string; source:'xlsx'|'pdf'; totalRows:number; newProducts:number; priceUpdates:number; detailUpdates:number; unchanged:number; errors:number; items:ImportDiffItem[];
}
type ParsedRow={rowNumber:number;sku?:string;name?:string;model_number?:string;category?:string;description?:string;price?:number};

const normal=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const headerIndex=(headers:string[],...names:string[])=>headers.findIndex(header=>names.includes(normal(header)));
const scalar=(value:unknown)=>typeof value==='string'||typeof value==='number'?String(value).trim():'';
function parseAmount(value:string){
 const cleaned=value.replace(/(?:inr|usd|eur|gbp|aed|rs\.?|₹|\$|€|£|,|\s)/gi,'');
 if(!/^\d+(?:\.\d{1,2})?$/.test(cleaned))return undefined;
 try{return money.parse(Number(cleaned));}catch{return undefined;}
}
function safeSku(name:string,row:number){
 return `IMPORT-${createHash('sha256').update(`${name}|${row}`).digest('hex').slice(0,12).toUpperCase()}`;
}

async function parseWorkbook(buffer:Buffer):Promise<ParsedRow[]>{
 validateZip(buffer);const workbook=new ExcelJS.Workbook();
 try{await workbook.xlsx.load(buffer as unknown as ArrayBuffer);}catch{throw new AppError(400,'Workbook could not be read. Upload an unencrypted .xlsx file.');}
 if(workbook.worksheets.length!==1)throw new AppError(400,'Import must contain exactly one worksheet');
 const sheet=workbook.worksheets[0];if(sheet.rowCount>2001||sheet.columnCount>50)throw new AppError(400,'Maximum import is 2,000 rows and 50 columns');
 const headers:string[]=[];sheet.getRow(1).eachCell((cell,column)=>{const value=scalar(cell.value);if(!value)throw new AppError(400,'Headers must be text');headers[column]=value;});
 const sku=headerIndex(headers,'sku','productcode','code','itemcode');const name=headerIndex(headers,'productname','product','name','description');const price=headerIndex(headers,'price','unitprice','rate','unitcost','masterprice','amount');
 if(name<1||price<1)throw new AppError(400,'Workbook needs Product Name and Price columns. SKU/Code, Category, Model No and Description are optional.');
 const category=headerIndex(headers,'category','productcategory'),model=headerIndex(headers,'modelno','model','modelnumber'),description=headerIndex(headers,'description','specification','details');
 const rows:ParsedRow[]=[];
 sheet.eachRow((row,rowNumber)=>{if(rowNumber===1)return;const cells=row.values as unknown[];if(!cells.some((value,index)=>index>0&&scalar(value)))return;const rawPrice=scalar(row.getCell(price).value);rows.push({rowNumber,sku:sku>0?scalar(row.getCell(sku).value):undefined,name:scalar(row.getCell(name).value),category:category>0?scalar(row.getCell(category).value):undefined,model_number:model>0?scalar(row.getCell(model).value):undefined,description:description>0?scalar(row.getCell(description).value):undefined,price:parseAmount(rawPrice)});});
 if(!rows.length)throw new AppError(400,'Workbook contains no product rows');return rows;
}

type PdfFragment={text:string;x:number;y:number};
type PdfLine={y:number;fragments:PdfFragment[]};
const pdfHeader=(buffer:Buffer)=>buffer.subarray(0,1024).indexOf('%PDF-')>=0;
const pdfLineText=(line:PdfLine)=>line.fragments.map(fragment=>fragment.text).join(' ').replace(/\s+/g,' ').trim();
const productCode=(value:string)=>/^(?=.{2,32}$)(?=.*[A-Za-z])[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value);
const sectionHeading=(value:string)=>value.length<100&&/^[A-Z][A-Z\d\s&(),./'-]+$/.test(value)&&!/[a-z]/.test(value);
const nonProductText=(value:string)=>/(?:above prices are subject|terms\s*&\s*conditions|narayankunj|panaspada|globetrekengineering@|indimart\.com|^\s*(?:ph|email|web)\s*[:.-])/i.test(value);
const strongPrice=(value:string,parsed:number)=>/(?:inr|usd|eur|gbp|aed|rs\.?|₹|\$|€|£|,|\.)/i.test(value)||parsed>100;
const skuSuffix=(value:string)=>value.toUpperCase().replace(/[^A-Z0-9]+/g,'').slice(0,24)||'VARIANT';
function splitPdfProductText(value:string){const full=value.replace(/\s+/g,' ').trim();if(full.length<=180)return {name:full};const name=full.slice(0,181).replace(/\s+\S*$/,'').trim()||full.slice(0,180).trim();return {name,description:full.slice(name.length).replace(/^[\s,;:\-–—]+/u,'').trim()||undefined};}
function groupPdfLines(items:unknown[]):PdfLine[]{
 const lines:PdfLine[]=[];
 for(const value of items){const item=value as {str?:unknown;transform?:unknown};if(typeof item.str!=='string'||!item.str.trim()||!Array.isArray(item.transform))continue;const x=Number(item.transform[4]),y=Number(item.transform[5]);if(!Number.isFinite(x)||!Number.isFinite(y))continue;let line=lines.find(candidate=>Math.abs(candidate.y-y)<=2);if(!line){line={y,fragments:[]};lines.push(line);}line.fragments.push({text:item.str.trim(),x,y});}
 return lines.sort((a,b)=>b.y-a.y).map(line=>({...line,fragments:line.fragments.sort((a,b)=>a.x-b.x)}));
}

export async function parsePdfPriceRows(buffer:Buffer):Promise<ParsedRow[]>{
 if(buffer.length>MAX_PRICE_LIST_FILE_BYTES)throw new AppError(413,'Maximum PDF size is 15 MB');
 if(!pdfHeader(buffer))throw new AppError(400,'The selected file is not a valid PDF');
 let pdfjs:typeof import('pdfjs-dist/legacy/build/pdf.mjs');
 try{pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');}catch{throw new AppError(503,'PDF import is temporarily unavailable on this server');}
 let document:{numPages:number;getPage(page:number):Promise<{getTextContent():Promise<{items:unknown[]}>;getViewport(options:{scale:number}):{width:number}}>};
 try{document=await pdfjs.getDocument({data:new Uint8Array(buffer),useWorkerFetch:false}).promise;}catch(error){console.error('Price-list PDF load failed',error instanceof Error?{name:error.name,message:error.message}:{message:'Unknown PDF.js error'});throw new AppError(400,'PDF could not be read. Upload a valid, non-encrypted PDF.');}
 if(document.numPages>MAX_PDF_PAGES)throw new AppError(400,`Maximum PDF length is ${MAX_PDF_PAGES} pages`);
 const parsed:{rowNumber:number;sku?:string;fullName:string;price:number}[]=[];
 let parent:{sku:string;fullName:string}|undefined;
 for(let page=1;page<=document.numPages;page++){
  const pdfPage=await document.getPage(page);const content=await pdfPage.getTextContent();const pageWidth=pdfPage.getViewport({scale:1}).width;let current:typeof parsed[number]|undefined;
  for(const line of groupPdfLines(content.items)){
   const text=pdfLineText(line);if(!text||nonProductText(text)){current=undefined;continue;}if(/^(price\s*list|sr\.?|s\.?no|product\s*(code|description)?|description|unit\s*(cost|rate|price)|total|page\s+\d+)/i.test(text)){continue;}
   const fragments=line.fragments;let priceIndex=-1,price:number|undefined;
   for(let index=fragments.length-1;index>=0;index--){const candidate=parseAmount(fragments[index].text);if(candidate!==undefined&&strongPrice(fragments[index].text,candidate)){priceIndex=index;price=candidate;break;}}
   if(priceIndex>=0&&price!==undefined){
    const before=fragments.slice(0,priceIndex);if(before.length&&/^\d+(?:\.\d+)?$/.test(before.at(-1)!.text)&&before.at(-1)!.x>pageWidth*.62)before.pop();
    let sku:string|undefined;const first=before[0]?.text||'';const embedded=first.match(/^([A-Za-z]+-[A-Za-z0-9._/-]+)\s+(.+)$/);if(embedded&&productCode(embedded[1])){sku=embedded[1];before[0]={...before[0],text:embedded[2]};}else if(productCode(first)){sku=first;before.shift();}else if(/^\d+[.)]?$/.test(first)){before.shift();}
    let fullName=before.map(fragment=>fragment.text).join(' ').replace(/\s+/g,' ').trim();
    if(parent&&sku&&/^[a-d]\.$/i.test(sku)){const discriminator=parent.sku==='GT-175'?(parent.fullName.includes('Three pressure')?'-3G':'-1G'):'';sku=`${parent.sku}${discriminator}-${skuSuffix(fullName)}`;fullName=`${parent.fullName} Capacity: ${fullName}`;}
    else if(parent&&sku&&sku.startsWith(parent.sku)&&fullName.length<40){sku=`${sku}-${skuSuffix(fullName)}${/^GT-6[23][ab]$/i.test(sku)?'MM':''}`;fullName=`${parent.fullName} ${fullName}${/^GT-6[23][ab]-/i.test(sku)?' mm':''}`;}
    if(sku==='GT-184')sku+=/hand operated/i.test(fullName)?'-HAND':'-ELECTRIC';
    if(sku==='GT-292')sku+=/digital readout/i.test(fullName)?'-DIGITAL':'-ELECTRICAL';
    if(sku&&parsed.some(row=>row.sku?.toLowerCase()===sku!.toLowerCase())){const base=`${sku}-${skuSuffix(fullName)}`;sku=base;let duplicate=2;while(parsed.some(row=>row.sku?.toLowerCase()===sku!.toLowerCase()))sku=`${base}-${duplicate++}`;}
    if(fullName){current={rowNumber:parsed.length+2,sku,fullName,price};parsed.push(current);continue;}
   }
   const parentFragments=[...fragments];if(parentFragments.length&&/^\d+(?:\.\d+)?$/.test(parentFragments.at(-1)!.text)&&parentFragments.at(-1)!.x>pageWidth*.62)parentFragments.pop();const parentCode=parentFragments[0]?.text||'';
   if(/^GT-[A-Za-z0-9._/-]+$/i.test(parentCode)){parentFragments.shift();parent={sku:parentCode,fullName:parentFragments.map(fragment=>fragment.text).join(' ').replace(/\s+/g,' ').trim()};current=undefined;continue;}
   if(current&&!sectionHeading(text)&&line.fragments[0].x>pageWidth*.06&&line.fragments[0].x<pageWidth*.8&&!/^\d+(?:\.\d+)?$/.test(text))current.fullName=`${current.fullName} ${text}`.replace(/\s+/g,' ').trim();
   else if(parent&&!sectionHeading(text)&&line.fragments[0].x>pageWidth*.06&&line.fragments[0].x<pageWidth*.8&&!/^\d+(?:\.\d+)?$/.test(text))parent.fullName=`${parent.fullName} ${text}`.replace(/\s+/g,' ').trim();
  }
 }
 const rows=parsed.map(row=>({...row,...splitPdfProductText(row.fullName),fullName:undefined})).map(({fullName:_,...row})=>row);
 if(!rows.length)throw new AppError(400,'No product and price rows were detected. Use a PDF with readable table text or import an Excel workbook. Scanned image-only PDFs require OCR before upload.');
 return rows;
}

export async function previewPriceListImport(buffer:Buffer,source:PriceListImportSummary['source'],name:string,currency:string,description:string,actor:string):Promise<PriceListImportSummary>{
 if(buffer.length>MAX_PRICE_LIST_FILE_BYTES)throw new AppError(413,`Maximum ${source==='pdf'?'PDF':'workbook'} size is 15 MB`);
 if(!name.trim())throw new AppError(400,'Price list name is required');if(!currencies.includes(currency as ImportCurrency))throw new AppError(400,'Invalid price list currency');
 const rows=source==='xlsx'?await parseWorkbook(buffer):await parsePdfPriceRows(buffer);
 return transaction(async c=>{await catalogLock(c);const lists=await serverDb.getPriceLists(c);if(lists.some(list=>list.name.toLowerCase()===name.trim().toLowerCase()))throw new AppError(409,'A price list with this name already exists. Choose a new name.');
  const products=await serverDb.getProducts(c),categories=await serverDb.getCategories(c),seen=new Set<string>(),items:ImportDiffItem[]=[];
  for(const row of rows){const productName=row.name?.trim()||'';const item:ImportDiffItem={rowNumber:row.rowNumber,sku:row.sku?.trim()||safeSku(productName,row.rowNumber),name:productName,model_number:row.model_number||undefined,category:row.category||undefined,description:productDescriptionDetail(productName,row.description),action:'unchanged',changes:[],prices:{},errorMessage:undefined};
   try{productSchema.parse(item);const key=item.sku.toLowerCase();if(seen.has(key))throw new Error('Duplicate SKU in import');seen.add(key);const old=products.find(product=>product.sku.toLowerCase()===key);if(old&&!old.is_active)throw new Error('Product is inactive; reactivate it before importing');if(row.price===undefined)throw new Error('Price must be a non-negative numeric value');item.prices.__new_price_list__=row.price;
    if(item.category&&!categories.some(category=>category.name.toLowerCase()===item.category!.toLowerCase()))item.changes.push(`Create category: ${item.category}`);
    if(!old){item.action='new';item.changes.push('Create product');}else{for(const field of ['name','model_number','description'] as const)if(item[field]!==undefined&&item[field]!==old[field])item.changes.push(`${field}: ${old[field]||'(empty)'} -> ${item[field]}`);if(item.category&&item.category!==old.category?.name)item.changes.push(`Category: ${old.category?.name||'(empty)'} -> ${item.category}`);item.action=item.changes.length?'details_update':'price_update';}
    item.changes.push(`${name.trim()}: (not set) -> ${row.price}`);
   }catch(error){item.action='error';item.errorMessage=error instanceof Error?error.message:'Invalid row';}
   items.push(item);
  }
  const summary:PriceListImportSummary={priceListName:name.trim(),currency:currency as ImportCurrency,description:description.trim(),source,totalRows:items.length,newProducts:items.filter(item=>item.action==='new').length,priceUpdates:items.filter(item=>item.action==='price_update').length,detailUpdates:items.filter(item=>item.action==='details_update').length,unchanged:items.filter(item=>item.action==='unchanged').length,errors:items.filter(item=>item.action==='error').length,items};
  const result=await c.query('INSERT INTO import_previews(user_id,payload,baseline) VALUES($1,$2,$3) RETURNING id',[actor,JSON.stringify({kind:'price-list-import',summary}),await catalogFingerprint(c)]);return {...summary,previewId:result.rows[0].id};
 });
}

export async function commitPriceListImport(previewId:string,actor:string){return transaction(async c=>{await catalogLock(c);const record=(await c.query('SELECT * FROM import_previews WHERE id=$1 AND user_id=$2 FOR UPDATE',[previewId,actor])).rows[0];if(!record)throw new AppError(404,'Import preview not found');if(record.committed_at)throw new AppError(409,'Import already committed');if(new Date(record.expires_at)<new Date())throw new AppError(409,'Preview expired; upload again');const payload=record.payload as {kind?:string;summary?:PriceListImportSummary};if(payload.kind!=='price-list-import'||!payload.summary)throw new AppError(400,'This preview is not a price-list import');const summary=payload.summary;if(summary.errors)throw new AppError(400,'Correct all invalid rows before committing');if(record.baseline!==await catalogFingerprint(c))throw new AppError(409,'Catalog changed after preview. Upload again to review current changes.');
 const list=(await c.query('INSERT INTO price_lists(name,currency,description) VALUES($1,$2,$3) RETURNING *',[summary.priceListName,summary.currency,summary.description])).rows[0];const products=await serverDb.getProducts(c),categories=await serverDb.getCategories(c);
 for(const item of summary.items){let category=categories.find(value=>value.name.toLowerCase()===item.category?.toLowerCase());if(item.category&&!category){category=(await c.query('INSERT INTO categories(name) VALUES($1) RETURNING *',[item.category])).rows[0];categories.push(category!);}const old=products.find(value=>value.sku.toLowerCase()===item.sku.toLowerCase());const price=item.prices.__new_price_list__;await serverDb.writeProduct(c,old?.id,{...old,...item,category_id:category?.id??old?.category_id}, {[list.id]:price},actor,`${summary.source.toUpperCase()} price-list import ${previewId}; row ${item.rowNumber}`);}
 await c.query('UPDATE import_previews SET committed_at=now() WHERE id=$1',[previewId]);return {priceList:{...list},newCount:summary.newProducts,updatedCount:summary.priceUpdates+summary.detailUpdates,priceCount:summary.totalRows};
 });}

export async function priceListImportTemplate(){const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Price List');sheet.columns=[{width:18},{width:42},{width:18},{width:22},{width:52},{width:16}];sheet.addRow(['SKU','Product Name','Category','Model No','Description','Price']);sheet.addRow(['CBR-001','California Bearing Ratio Test Apparatus','Soil Testing','','Complete CBR test apparatus',825]);sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF112A46'}};sheet.getColumn(6).numFmt='#,##0.00';return workbook.xlsx.writeBuffer();}
