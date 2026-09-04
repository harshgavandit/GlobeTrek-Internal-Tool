import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Quotation } from '../src/types';
import { renderPDF } from '../src/lib/export-service';

let source:Quotation;
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
  return {...base,id:randomUUID(),product_id:randomUUID(),product_name:index<source.items.length?base.product_name:`${base.product_name} - Variant ${index+1}`,sku:`PDF-${String(index+1).padStart(3,'0')}`,quantity,unit_price,master_price:unit_price,discount_percent:0,line_total:unit_price*quantity,description:longDescriptions?`${base.description||base.product_name}\n${technical}`:base.description};
 });
 const subtotal=items.reduce((sum,item)=>sum+item.line_total,0);const packaging_charges=150,freight_charges=450,insurance_charges=50,tax_percent=18;
 const tax_amount=Number(((subtotal+packaging_charges+freight_charges+insurance_charges)*tax_percent/100).toFixed(2));
 return {...source,id:randomUUID(),quotation_number:`GTEC/PDF/${count}/2026-27`,customer_reference:'Email enquiry for laboratory testing equipment',items,subtotal,packaging_charges,freight_charges,insurance_charges,other_charges:0,discount_amount:0,tax_percent,tax_amount,total_amount:subtotal+packaging_charges+freight_charges+insurance_charges+tax_amount,payment_terms:'100% payment against proforma invoice prior to dispatch.',delivery_terms:'Available stock or within 1 to 2 weeks from receipt of a technically and commercially clear purchase order.',warranty_terms:'One year against manufacturing defects under normal working conditions.',validity_terms:'30 days from the date of issue.',freight_terms:'Freight and transit charges will be borne by the buyer.',notes:'Errors and omissions are subject to correction without prior notice.',company_snapshot:{...source.company_snapshot,bank_accounts:[{bank_name:'IDFC FIRST Bank',account_name:source.company_snapshot.company_name,account_no:'10148119695',ifsc:'IDFB0040172',branch:'CBD Belapur, Navi Mumbai'},{bank_name:'Indian Bank',account_name:source.company_snapshot.company_name,account_no:'6209411911',ifsc:'IDIB000N110',branch:'Nerul East, Navi Mumbai'}]}};
}

async function main(){
 const fixture=JSON.parse(await fs.readFile('tmp/audit/fixture.json','utf8'));source=fixture.quotation as Quotation;
 await fs.mkdir('tmp/pdf-template/generated',{recursive:true});
 for(const [name,count,longDescriptions] of [['test-a-4',4,false],['test-b-15',15,false],['test-c-36-long',36,true]] as const){
  const bytes=await renderPDF(quotation(count,longDescriptions));
  if(bytes.length<1000||String.fromCharCode(...bytes.slice(0,4))!=='%PDF')throw new Error(`${name} is not a valid PDF`);
  await fs.writeFile(`tmp/pdf-template/generated/${name}.pdf`,bytes);
  console.log(`PASS ${name}: ${count} products, ${bytes.length} bytes`);
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
