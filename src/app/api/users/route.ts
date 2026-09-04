import { serverDb } from '@/lib/db/postgres';
import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema, money, userSchema } from '@/lib/validation';
import { hashPassword } from '@/lib/auth';
export async function GET(){try{await requireUser(true);return ok(await serverDb.getUsers());}catch(e){return fail(e);}}
export async function POST(req:Request){try{await requireUser(true);const b=userSchema.parse(await readBody(req));return ok(await serverDb.createUser({...b,password_hash:await hashPassword(b.password)}));}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{const u=await requireUser(true);checkOrigin(req);await serverDb.deleteUser(idSchema.parse(new URL(req.url).searchParams.get('id')),u.id);return ok(null);}catch(e){return fail(e);}}
