import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema,AppError } from '@/lib/validation';
import { previewImport,commitImport,importTemplate } from '@/lib/import-service';
export const runtime='nodejs';
export async function GET(){try{await requireUser(true);return new Response(new Uint8Array(await importTemplate()),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="Globetrek_Import_Template.xlsx"','Cache-Control':'no-store'}});}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await requireUser(true);checkOrigin(req);if(!req.headers.get('content-type')?.includes('spreadsheetml.sheet'))throw new AppError(415,'Only .xlsx workbooks are supported');const reader=req.body?.getReader();if(!reader)throw new AppError(400,'Workbook is required');const chunks:Uint8Array[]=[];let size=0;while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>5*1024*1024){await reader.cancel();throw new AppError(413,'Maximum workbook size is 5 MB');}chunks.push(part.value);}return ok(await previewImport(Buffer.concat(chunks),u.id));}catch(e){return fail(e);}}
export async function PUT(req:Request){try{const u=await requireUser(true);const body=await readBody(req);return ok(await commitImport(idSchema.parse(body.previewId),u.id));}catch(e){return fail(e);}}
