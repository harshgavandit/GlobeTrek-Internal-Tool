import { serverDb } from '@/lib/db/postgres';
import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema, money, userSchema } from '@/lib/validation';

export async function GET(req:Request){try{await requireUser();const id=new URL(req.url).searchParams.get('id');return ok(id?await serverDb.getQuotationById(idSchema.parse(id)):await serverDb.getQuotations());}catch(e){return fail(e);}}
export async function POST(req:Request){try{const u=await requireUser();const b=await readBody(req);if(b.action==='preview')return ok(await serverDb.previewQuotation(b,u));return ok(await serverDb.createQuotation(b,u,idSchema.parse(b.request_id),b.action==='duplicate'?idSchema.parse(b.sourceId):undefined));}catch(e){return fail(e);}}
export async function PUT(req:Request){try{const u=await requireUser();const b=await readBody(req);return ok(await serverDb.updateQuotation(idSchema.parse(b.id),b,u));}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{await requireUser(true);checkOrigin(req);await serverDb.deleteQuotation(idSchema.parse(new URL(req.url).searchParams.get('id')));return ok(null);}catch(e){return fail(e);}}
