import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Quotation } from '../src/types';
import ExcelJS from 'exceljs';
import { renderExcel, renderPDF } from '../src/lib/export-service';
import { STANDARD_TERMS_VERSION } from '../src/lib/quotation-terms';

let source:Quotation;
const coreCutterName='Core Cutter Apparatus, (Field Density - Core Cutter Method) as per IS:2720. Cutter is made of steel 100mm dia. x 130mm long with steel Dolly 25 mm high and 100 mm dia., fitted with';
const coreCutterDescription=`${coreCutterName} a lip to enable it to be located on top of the core cutter. Supplied complete with rammer, weight approx 9kg.`;
const technical=[
 'Heavy-duty laboratory construction with calibrated digital indication.',
 'Operating range 0 to 2000 kN; resolution ± 0.01 kN; accuracy better than 1%.',
 'Symbol coverage: ₹, $, €, 50%, 120° and ±0.01.',
 'Supplied with standard accessories, installation instructions and calibration certificate.',
 'Pace Rate - Manual'
].join('\n');

function quotation(count:number,longDescriptions=false):Quotation{
 const items=Array.from({length:count},(_,index)=>{
  const base=source.items[index%source.items.length];
  const quantity=index%5===0?2:1;
  const unit_price=base.unit_price+(index%7)*25;
  return {...base,id:randomUUID(),product_id:randomUUID(),product_name:index===0?coreCutterName:index<source.items.length?base.product_name:`${base.product_name} - Variant ${index+1}`,sku:index===0?'GT-01':`PDF-${String(index+1).padStart(3,'0')}`,quantity,unit_price,master_price:unit_price,discount_percent:0,line_total:unit_price*quantity,description:index===0?coreCutterDescription:longDescriptions?`${base.description||base.product_name}\n${technical}`:base.description};
 });
 const subtotal=items.reduce((sum,item)=>sum+item.line_total,0);const packaging_charges=150,freight_charges=450,insurance_charges=50,tax_percent=18;
 const tax_amount=Number(((subtotal+packaging_charges+freight_charges+insurance_charges)*tax_percent/100).toFixed(2));
 return {...source,id:randomUUID(),quotation_number:`GTEC/PDF/${count}/2026-27`,customer_reference:'Email enquiry for laboratory testing equipment',items,subtotal,packaging_charges,freight_charges,insurance_charges,other_charges:0,discount_amount:0,tax_percent,tax_amount,total_amount:subtotal+packaging_charges+freight_charges+insurance_charges+tax_amount,payment_terms:'100% payment against proforma invoice prior to dispatch.',delivery_terms:'Available stock or within 1 to 2 weeks from receipt of a technically and commercially clear purchase order.',warranty_terms:'One year against manufacturing defects under normal working conditions.',validity_terms:'30 days from the date of issue.',freight_terms:'Freight and transit charges will be borne by the buyer.',notes:'Errors and omissions are subject to correction without prior notice.',company_snapshot:{...source.company_snapshot,terms_template_version:STANDARD_TERMS_VERSION,bank_accounts:[{bank_name:'IDFC FIRST Bank',account_name:'Globetrek Engineering Corporation',account_no:'10148119695',ifsc:'IDFB0040172',branch:'Navi Mumbai CBD Belapur Branch'},{bank_name:'Indian Bank',account_name:'Globetrek Engineering Corporation',account_no:'6209411911',ifsc:'IDIB000N110',branch:'Nerul, Nerul East, Navi Mumbai'}]}};
}

async function pdfText(bytes:Uint8Array){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');const document=await pdfjs.getDocument({data:bytes.slice(),useWorkerFetch:false}).promise;const text:string[]=[];for(let page=1;page<=document.numPages;page++){const content=await (await document.getPage(page)).getTextContent();for(const item of content.items)if('str'in item)text.push(item.str);}return text.join(' ').replace(/\s+/g,' ');}
const requiredTerms=['1. Validity of Quotation:','10. Payment Terms:','Bank Details:','11. Bank Charges:','14. Errors & Omissions:','10148119695','IDIB000N110'];
function verifyTerms(text:string,label:string){for(const expected of requiredTerms)if(!text.includes(expected))throw new Error(`${label} is missing ${expected}`);const ordered=requiredTerms.slice(0,5).map(expected=>text.indexOf(expected));if(ordered.some((position,index)=>index>0&&position<=ordered[index-1]))throw new Error(`${label} terms or Bank Details are out of order`);}
function verifyProductText(text:string,label:string){const normalized=text.replace(/\s+/g,' ');const occurrences=normalized.match(/Core Cutter Apparatus/g)?.length||0;if(occurrences!==1)throw new Error(`${label} rendered Core Cutter Apparatus ${occurrences} times instead of once`);if(!normalized.includes('Supplied complete with rammer, weight approx 9kg.'))throw new Error(`${label} lost the Core Cutter description suffix`);}

async function main(){
 const fixture=JSON.parse(await fs.readFile('tmp/audit/fixture.json','utf8'));source=fixture.quotation as Quotation;
 await fs.mkdir('tmp/pdf-template/generated',{recursive:true});
 for(const [name,count,longDescriptions] of [['test-a-4',4,false],['test-b-15',15,false],['test-c-36-long',36,true]] as const){
  const bytes=await renderPDF(quotation(count,longDescriptions));
  if(bytes.length<1000||String.fromCharCode(...bytes.slice(0,4))!=='%PDF')throw new Error(`${name} is not a valid PDF`);
  await fs.writeFile(`tmp/pdf-template/generated/${name}.pdf`,bytes);const extracted=await pdfText(bytes);verifyTerms(extracted,`${name} PDF`);verifyProductText(extracted,`${name} PDF`);
  if(name==='test-a-4'){const excel=await renderExcel(quotation(count,longDescriptions));await fs.writeFile('tmp/pdf-template/generated/test-a-4.xlsx',excel);const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(excel as unknown as ArrayBuffer);const excelText:string[]=[];workbook.worksheets[0].eachRow(row=>row.eachCell(cell=>excelText.push(String(cell.value??''))));const extractedExcel=excelText.join(' ');verifyTerms(extractedExcel,'Excel');verifyProductText(extractedExcel,'Excel');console.log(`PASS test-a-4 Excel: exact terms, bank details, and non-duplicated product text`);}
  console.log(`PASS ${name}: ${count} products, ${bytes.length} bytes`);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
