import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Quotation } from '@/types';
import { quotationBankAccounts, quotationTermSections, QuotationTermSection } from './quotation-terms';
import { productDescriptionDetail } from './product-description';

const NAVY:[number,number,number]=[17,42,70];
const BLACK:[number,number,number]=[20,20,20];
const SIDE=48;
const TOP=92;
const BOTTOM=790;
const PAGE_WIDTH=595.28;
const CONTENT_WIDTH=499;
let fontData:Promise<string>|undefined;

const lastTableY=(doc:jsPDF)=>(doc as unknown as {lastAutoTable?:{finalY:number}}).lastAutoTable?.finalY??TOP;
const currencyAmount=(value:number,currency:string)=>value.toLocaleString(currency==='INR'?'en-IN':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const quantity=(value:number)=>Number.isInteger(value)?String(value).padStart(2,'0'):value.toLocaleString('en-US',{maximumFractionDigits:3});
const longDate=(value:string)=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date(`${value}T00:00:00+05:30`)).toUpperCase();

async function logoData(q:Quotation){
 const logo='/brand/globetrek-new-logo.png';
 if(!logo||!/^\/brand\/[A-Za-z0-9._-]+$/.test(logo))return undefined;
 try{return (await readFile(path.join(process.cwd(),'public',...logo.split('/').filter(Boolean)))).toString('base64');}catch{return undefined;}
}

function pageBreakIfNeeded(doc:jsPDF,y:number,height:number){
 if(y+height<=BOTTOM)return y;
 doc.addPage();
 return TOP;
}

export async function renderReferenceQuotationPDF(q:Quotation){
 const doc=new jsPDF({unit:'pt',format:'a4',orientation:'portrait',putOnlyUsedFonts:true,compress:true});
 fontData??=readFile(path.join(process.cwd(),'assets/fonts/DejaVuSans.ttf')).then(buffer=>buffer.toString('base64'));
 doc.addFileToVFS('DejaVuSans.ttf',await fontData);doc.addFont('DejaVuSans.ttf','DejaVu','normal');doc.addFont('DejaVuSans.ttf','DejaVu','bold');
 const logo=await logoData(q);
 doc.setFont('DejaVu','bold');doc.setFontSize(8.5);doc.setTextColor(...BLACK);
 let y=TOP+2;
 doc.text(`REFERENCE NO- ${q.quotation_number}`,SIDE,y);
 doc.text(`DATE: ${longDate(q.quotation_date)}`,PAGE_WIDTH-SIDE,y,{align:'right'});
 y+=24;doc.setFontSize(9.5);doc.text('To,',SIDE,y);y+=14;
 doc.setFont('DejaVu','bold');doc.text(q.customer_name.toUpperCase(),SIDE+4,y);y+=13;
 doc.setFont('DejaVu','normal');doc.setFontSize(9);
 const customerAddress=[q.customer_address,q.customer_city,q.customer_country].filter(Boolean).join(', ');
 if(customerAddress){const lines=doc.splitTextToSize(customerAddress,330);doc.text(lines,SIDE+4,y);y+=lines.length*11;}
 if(q.customer_phone){doc.text(`Contact No : ${q.customer_phone}`,SIDE+4,y);y+=11;}
 if(q.customer_email){doc.text(`Email : ${q.customer_email}`,SIDE+4,y);y+=11;}
 y+=20;doc.setFont('DejaVu','bold');doc.text(`Ref: ${q.customer_reference?.trim()||q.quotation_number}`,SIDE,y);y+=27;
 doc.setFont('DejaVu','normal');doc.text('Dear Sir,',SIDE,y);y+=24;
 doc.text('With reference to above, we are pleased to submit our quotation as follows.',SIDE,y);y+=14;

 const descriptionWidth=290;
 const layouts=q.items.map(item=>{
  doc.setFontSize(8.4);doc.setFont('DejaVu','bold');const title=doc.splitTextToSize(item.product_name,descriptionWidth);
  doc.setFont('DejaVu','normal');const details=[item.model_number?`Model: ${item.model_number}`:'',productDescriptionDetail(item.product_name,item.description)].filter(Boolean).join('\n');
  const detail=details?details.split('\n').flatMap(line=>doc.splitTextToSize(line,descriptionWidth)):[];
  return {title,detail,height:Math.max(28,8+(title.length+detail.length)*10)};
 });
 autoTable(doc,{
  startY:y,margin:{left:SIDE,right:SIDE,top:TOP,bottom:52},tableWidth:CONTENT_WIDTH,theme:'grid',showHead:'everyPage',rowPageBreak:'avoid',
  head:[['Sr.\nNo.','PRODUCT DESCRIPTION','QTY',`UNIT COST EX-WORKS MUMBAI IN ${q.currency}`,`TOTAL AMOUNT ${q.currency}`]],
  body:q.items.map((item,index)=>[String(index+1).padStart(2,'0'),'',quantity(item.quantity),currencyAmount(item.unit_price,q.currency),currencyAmount(item.line_total,q.currency)]),
  styles:{font:'DejaVu',fontSize:8.4,textColor:BLACK,lineColor:[0,0,0],lineWidth:0.55,cellPadding:4,valign:'top',overflow:'linebreak'},
  headStyles:{fillColor:NAVY,textColor:[255,255,255],font:'DejaVu',fontStyle:'bold',fontSize:8.1,halign:'center',valign:'middle',minCellHeight:48,lineColor:[0,0,0],lineWidth:0.7},
  columnStyles:{0:{cellWidth:32,halign:'center',fontStyle:'bold'},1:{cellWidth:298},2:{cellWidth:30,halign:'center',fontStyle:'bold'},3:{cellWidth:69,halign:'right',fontStyle:'bold'},4:{cellWidth:70,halign:'right',fontStyle:'bold'}},
  didParseCell:data=>{if(data.section==='body'&&data.column.index===1){data.cell.text=[''];data.cell.styles.minCellHeight=layouts[data.row.index].height;}},
  didDrawCell:data=>{if(data.section==='body'&&data.column.index===1){const layout=layouts[data.row.index];let lineY=data.cell.y+11;doc.setFontSize(8.4);doc.setTextColor(...BLACK);doc.setFont('DejaVu','bold');for(const line of layout.title){doc.text(line,data.cell.x+4,lineY);lineY+=10;}doc.setFont('DejaVu','normal');for(const line of layout.detail){doc.text(line,data.cell.x+4,lineY);lineY+=10;}}}
 });

 const totals:[string,string][]=[
  ['Sub Total',currencyAmount(q.subtotal,q.currency)],
  ['Packing Charge',currencyAmount(q.packaging_charges,q.currency)],
  ['Freight Charge',currencyAmount(q.freight_charges,q.currency)],
  ['Insurance',currencyAmount(q.insurance_charges,q.currency)],
  ['Other Charges',currencyAmount(q.other_charges,q.currency)],
  ['Discount',currencyAmount(q.discount_amount,q.currency)],
  [`GST @${q.tax_percent}%`,currencyAmount(q.tax_amount,q.currency)],
  ['Grand Total',currencyAmount(q.total_amount,q.currency)]
 ];
 autoTable(doc,{startY:lastTableY(doc),margin:{left:SIDE,right:SIDE,top:TOP,bottom:52},tableWidth:CONTENT_WIDTH,theme:'grid',body:totals,
  styles:{font:'DejaVu',fontStyle:'bold',fontSize:8.5,textColor:BLACK,lineColor:[0,0,0],lineWidth:0.55,cellPadding:4},
  columnStyles:{0:{cellWidth:429,halign:'right'},1:{cellWidth:70,halign:'center'}}});

 y=pageBreakIfNeeded(doc,lastTableY(doc)+16,40);
 doc.setFillColor(...NAVY);doc.rect(SIDE,y,CONTENT_WIDTH,18,'F');doc.setFont('DejaVu','bold');doc.setFontSize(9);doc.setTextColor(255,255,255);doc.text('TERMS & CONDITIONS',PAGE_WIDTH/2,y+12,{align:'center'});y+=26;
 const sections=quotationTermSections(q);
 const drawTerms=(selected:QuotationTermSection[],startY:number)=>{const termRows:(string|{content:string;styles:{fontStyle:'bold'|'normal';cellPadding:{top:number;right:number;bottom:number;left:number}}})[][]=[];selected.forEach(section=>{termRows.push([{content:`${section.number}. ${section.title}:`,styles:{fontStyle:'bold',cellPadding:{top:6,right:0,bottom:2,left:0}}}]);section.bullets.forEach(bullet=>termRows.push([{content:`•  ${bullet}`,styles:{fontStyle:'normal',cellPadding:{top:1,right:0,bottom:2,left:18}}}]));});if(termRows.length)autoTable(doc,{startY,margin:{left:SIDE,right:SIDE,top:TOP,bottom:52},tableWidth:CONTENT_WIDTH,theme:'plain',body:termRows,styles:{font:'DejaVu',fontSize:8.7,textColor:BLACK,overflow:'linebreak',cellPadding:2},columnStyles:{0:{cellWidth:CONTENT_WIDTH}}});};
 const paymentIndex=sections.findIndex(section=>section.number===10);const firstTerms=paymentIndex>=0?sections.slice(0,paymentIndex+1):sections;const finalTerms=paymentIndex>=0?sections.slice(paymentIndex+1):[];drawTerms(firstTerms,y);

 const accounts=quotationBankAccounts(q);
 if(accounts.length){
  y=pageBreakIfNeeded(doc,lastTableY(doc)+12,80);doc.setFont('DejaVu','bold');doc.setFontSize(9);doc.setTextColor(...BLACK);doc.text('Bank Details:',SIDE,y);y+=8;
  for(let index=0;index<accounts.length;index+=2){const pair=accounts.slice(index,index+2);
   const bankRows=[
    pair.map(account=>`For Credit to - ${account.account_name||q.company_snapshot.company_name}`),
    pair.map(account=>`Bank Name: ${account.bank_name}`),
    pair.map(account=>`Account No: ${account.account_no}`),
    pair.map(account=>`IFSC Code: ${account.ifsc}`),
    pair.map(account=>account.branch?`Branch: ${account.branch}`:''),
    pair.map(account=>account.swift?`SWIFT: ${account.swift}`:'')
   ].filter(row=>row.some(Boolean));
   autoTable(doc,{startY:y,margin:{left:SIDE,right:SIDE,top:TOP,bottom:52},tableWidth:CONTENT_WIDTH,theme:'grid',body:bankRows,
    styles:{font:'DejaVu',fontStyle:'bold',fontSize:8,textColor:BLACK,lineColor:[0,0,0],lineWidth:0.55,cellPadding:5,overflow:'linebreak',valign:'top'},
    columnStyles:pair.length===1?{0:{cellWidth:CONTENT_WIDTH}}:{0:{cellWidth:CONTENT_WIDTH/2},1:{cellWidth:CONTENT_WIDTH/2}}});y=lastTableY(doc)+7;
  }
 }

 if(finalTerms.length){y=pageBreakIfNeeded(doc,lastTableY(doc)+8,30);drawTerms(finalTerms,y);}

 y=pageBreakIfNeeded(doc,lastTableY(doc)+16,120);doc.setFont('DejaVu','normal');doc.setFontSize(8.8);doc.setTextColor(...BLACK);
 const closing=[
  'If you require any further clarification or additional information, please feel free to contact us at your convenience.',
  'Thanking you, and always assuring you of our best services and attention, we remain.'
 ];
 for(const paragraph of closing){const lines=doc.splitTextToSize(paragraph,CONTENT_WIDTH);doc.text(lines,SIDE,y);y+=lines.length*11+5;}
 y+=5;doc.setFont('DejaVu','bold');doc.text('Yours faithfully,',SIDE,y);y+=38;doc.text(q.created_by_name,SIDE,y);y+=11;doc.text('(Authorized Representative)',SIDE,y);y+=11;doc.text(`Contact: ${q.company_snapshot.phone}`,SIDE,y);y+=11;doc.text(q.company_snapshot.company_name,SIDE,y);

 const footerLines=[
  `Address: ${q.company_snapshot.address}`,
  `Mobile - ${q.company_snapshot.phone}`,
  `Email - ${q.company_snapshot.email}${q.company_snapshot.website?`   Web - ${q.company_snapshot.website}`:''}`
 ];
 for(let page=1;page<=doc.getNumberOfPages();page++){
  doc.setPage(page);doc.setFillColor(255,255,255);doc.rect(0,0,PAGE_WIDTH,86,'F');
  if(logo)doc.addImage(logo,'PNG',SIDE,12,170,64);else{doc.setFont('DejaVu','bold');doc.setFontSize(14);doc.setTextColor(...NAVY);doc.text(q.company_snapshot.company_name,SIDE,44);}
  doc.setFont('times','bold');doc.setFontSize(18);doc.setTextColor(0,0,0);doc.text('SALES QUOTATION',PAGE_WIDTH-SIDE,55,{align:'right'});
  doc.setDrawColor(...NAVY);doc.setLineWidth(1);doc.line(SIDE,80,PAGE_WIDTH-SIDE,80);
  doc.setFillColor(...NAVY);doc.rect(SIDE,802,CONTENT_WIDTH,30,'F');doc.setFont('DejaVu','bold');doc.setFontSize(6.2);doc.setTextColor(255,255,255);
  footerLines.forEach((line,index)=>doc.text(line,PAGE_WIDTH/2,811+index*8,{align:'center',maxWidth:CONTENT_WIDTH-12}));
 }
 return new Uint8Array(doc.output('arraybuffer'));
}
