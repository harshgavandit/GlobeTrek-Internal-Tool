import { requireUser } from '@/lib/auth';
import { serverDb } from '@/lib/db/postgres';
import { renderPDF,renderExcel,renderWord } from '@/lib/export-service';
import { fail } from '@/lib/api';
import { idSchema,AppError } from '@/lib/validation';
export const runtime='nodejs';
export async function GET(req:Request){try{await requireUser();const params=new URL(req.url).searchParams;const q=await serverDb.getQuotationById(idSchema.parse(params.get('id')));if(Number(params.get('revision'))!==q.revision)throw new AppError(409,'Quotation changed. Reload before exporting.');const format=params.get('format');if(format!=='pdf'&&format!=='xlsx'&&format!=='docx')throw new AppError(400,'Choose PDF, XLSX, or DOCX');const bytes=format==='pdf'?await renderPDF(q):format==='xlsx'?await renderExcel(q):await renderWord(q);const contentTypes={pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'} as const;return new Response(bytes,{headers:{'Content-Type':contentTypes[format],'Content-Disposition':`attachment; filename="${q.quotation_number.replace(/[^a-z0-9_-]/gi,'_')}.${format}"`,'Cache-Control':'no-store','X-Quotation-Revision':String(q.revision)}});}catch(e){return fail(e);}}
