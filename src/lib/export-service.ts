import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Quotation } from '@/types';
import { quotationDocument } from './quotation-document';
import { renderReferenceQuotationPDF } from './quotation-pdf';
const itemDescription=(i:Quotation['items'][number])=>[i.product_name,i.model_number?`Model: ${i.model_number}`:'',i.description].filter(Boolean).join('\n');
async function companyLogo(q:Quotation){
 const logo=q.company_snapshot.logo_path;
 if(!logo||!/^\/brand\/[A-Za-z0-9._-]+$/.test(logo))return undefined;
 try{return await readFile(path.join(process.cwd(),'public',...logo.split('/').filter(Boolean)));}catch{return undefined;}
}
// Excel caps row height at 409 points. Continuation rows retain long text visibly.
function textBlocks(text:string,width:number){
 const lines=text.split('\n').flatMap(line=>{const out:string[]=[];for(let n=0;n<line.length;n+=width)out.push(line.slice(n,n+width));return out.length?out:[''];});
 const blocks:string[]=[];for(let n=0;n<lines.length;n+=18)blocks.push(lines.slice(n,n+18).join('\n'));return blocks;
}
export const renderPDF=renderReferenceQuotationPDF;
export async function renderExcel(q:Quotation){
 const m=quotationDocument(q),wb=new ExcelJS.Workbook(),logo=await companyLogo(q);wb.creator='Globetrek Quotation System';wb.created=new Date(q.created_at);wb.modified=new Date(q.updated_at);
 const sheet=wb.addWorksheet('Quotation',{pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0},views:[{showGridLines:false}]});
 sheet.columns=[7,55,25,12,20,20,12,24].map(width=>({width}));
 const heading=(title:string)=>{const r=sheet.addRow([title]);sheet.mergeCells(r.number,1,r.number,8);r.height=26;r.font={bold:true,color:{argb:'FFFFFFFF'},size:12};r.getCell(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0270C7'}};};
 const pairs=(rows:string[][])=>rows.filter(([,v])=>v).forEach(([k,v])=>textBlocks(v,75).forEach((block,n)=>{const r=sheet.addRow([n?`${k} (continued)`:k,'','',block]);sheet.mergeCells(r.number,1,r.number,3);sheet.mergeCells(r.number,4,r.number,8);r.height=Math.max(24,block.split('\n').length*16+8);r.alignment={wrapText:true,vertical:'top'};r.getCell(1).font={bold:true};}));
 for(const height of [24,28,20,20,18]){const row=sheet.addRow([]);row.height=height;}
 sheet.mergeCells('A1:C5');sheet.mergeCells('D1:H1');sheet.mergeCells('D2:H2');sheet.mergeCells('D3:F3');sheet.mergeCells('G3:H3');sheet.mergeCells('D4:F4');sheet.mergeCells('G4:H4');sheet.mergeCells('D5:H5');
 if(logo){const image=wb.addImage({base64:logo.toString('base64'),extension:'jpeg'});sheet.addImage(image,{tl:{col:0.15,row:0.15},ext:{width:290,height:108}});}
 const s=q.company_snapshot;sheet.getCell('D1').value=s.company_name;sheet.getCell('D1').font={bold:true,size:15,color:{argb:'FF0270C7'}};sheet.getCell('D2').value=s.address;sheet.getCell('D3').value=`Mob. ${s.phone}`;sheet.getCell('G3').value=`GSTIN: ${s.gstin}`;sheet.getCell('D4').value=`Email: ${s.email}`;sheet.getCell('G4').value=s.website?`Web: ${s.website}`:'';sheet.getCell('D5').value=s.company_tagline||'';
 for(const address of ['D1','D2','D3','G3','D4','G4','D5'])sheet.getCell(address).alignment={wrapText:true,vertical:'middle'};
 sheet.addRow([]).height=8;heading('PROFORMA QUOTATION');heading('Quotation & Customer Details');pairs([...m.metadata,...m.customer]);
 heading('Equipment & Pricing');const header=sheet.addRow(['#','Description','SKU','Qty',`Master (${q.currency})`,`Quoted (${q.currency})`,'Disc %',`Total (${q.currency})`]);header.font={bold:true};header.height=30;header.alignment={wrapText:true};
 for(const [n,i] of q.items.entries())textBlocks(itemDescription(i),42).forEach((block,index)=>{const r=sheet.addRow(index?['',block,'','','','','','']:[n+1,block,i.sku,i.quantity,i.master_price,i.unit_price,i.discount_percent/100,i.line_total]);r.height=Math.max(36,block.split('\n').length*16+8);r.alignment={wrapText:true,vertical:'top'};[5,6,8].forEach(col=>r.getCell(col).numFmt='#,##0.00');r.getCell(7).numFmt='0.00%';});
 heading('Quotation Total');for(const [key,value] of m.totals){const r=sheet.addRow([key,'','','','','','',value]);sheet.mergeCells(r.number,1,r.number,7);r.height=23;r.getCell(8).numFmt='#,##0.00';if(key==='Grand Total')r.font={bold:true,size:12};}
 heading('Amount in Words');const words=sheet.addRow([m.words]);sheet.mergeCells(words.number,1,words.number,8);words.alignment={wrapText:true};words.height=30;
 heading('Commercial Terms');pairs(m.terms);heading('Company & Bank Details');pairs([...m.company,...m.bank]);
 sheet.eachRow(r=>r.eachCell(c=>{c.font={name:'Calibri',size:10,...c.font};}));
 return new Uint8Array(await wb.xlsx.writeBuffer());
}
