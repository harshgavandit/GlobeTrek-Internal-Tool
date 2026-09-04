import { Quotation } from '@/types';
export async function downloadQuotation(q:Quotation,format:'pdf'|'xlsx'){
 const r=await fetch(`/api/quotations/export?id=${q.id}&revision=${q.revision}&format=${format}`);
 if(!r.ok){const j=await r.json();throw new Error(j.error||'Export failed');}
 const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=q.quotation_number.replace(/[^a-z0-9_-]/gi,'_')+'.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return blob;
}
