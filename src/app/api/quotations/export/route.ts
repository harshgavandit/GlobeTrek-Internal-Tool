import { requireUser } from '@/lib/auth';
import { serverDb } from '@/lib/db/postgres';
import { renderPDF,renderExcel } from '@/lib/export-service';
import { fail } from '@/lib/api';
import { idSchema,AppError } from '@/lib/validation';
export const runtime='nodejs';
export async function GET(req:Request){try{await requireUser();const params=new URL(req.url).searchParams;const q=await serverDb.getQuotationById(idSchema.parse(params.get('id')));if(Number(params.get('revision'))!==q.revision)throw new AppError(409,'Quotation changed. Reload before exporting.');const format=params.get('format');if(format!=='pdf'&&format!=='xlsx')throw new AppError(400,'Choose PDF or XLSX');const bytes=format==='pdf'?await renderPDF(q):await renderExcel(q);return new Response(bytes,{headers:{'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="${q.quotation_number.replace(/[^a-z0-9_-]/gi,'_')}.${format}"`,'Cache-Control':'no-store','X-Quotation-Revision':String(q.revision)}});}catch(e){return fail(e);}}
