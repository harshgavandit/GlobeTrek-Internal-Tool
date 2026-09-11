import { ImportDiffsSummary } from './excel-importer';
export type PriceListImportSummary=ImportDiffsSummary&{priceListName:string;currency:string;description:string;source:'xlsx'|'pdf'};
async function response(res:Response){const json=await res.json();if(!res.ok)throw new Error(json.error||'Price-list import failed');return json.data;}
export async function previewPriceListFile(file:File,name:string,currency:string,description:string):Promise<PriceListImportSummary>{const form=new FormData();form.set('file',file);form.set('name',name);form.set('currency',currency);form.set('description',description);return response(await fetch('/api/price-list-imports',{method:'POST',body:form}));}
export async function commitPriceListFile(previewId:string){return response(await fetch('/api/price-list-imports',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({previewId})}));}
export async function downloadPriceListTemplate(){const response=await fetch('/api/price-list-imports');if(!response.ok){const json=await response.json();throw new Error(json.error||'Template download failed');}return response.arrayBuffer();}
