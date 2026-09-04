import { serverDb } from '@/lib/db/postgres';
import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema } from '@/lib/validation';
export async function GET(){try{await requireUser();return ok(await serverDb.getPriceLists());}catch(e){return fail(e);}}
export async function POST(req:Request){try{await requireUser(true);return ok(await serverDb.createPriceList(await readBody(req)));}catch(e){return fail(e);}}
export async function PUT(req:Request){try{await requireUser(true);const body=await readBody(req);return ok(await serverDb.updatePriceList(idSchema.parse(body.id),body));}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{await requireUser(true);checkOrigin(req);await serverDb.deletePriceList(idSchema.parse(new URL(req.url).searchParams.get('id')));return ok(null);}catch(e){return fail(e);}}
