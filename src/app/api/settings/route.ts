import { serverDb } from '@/lib/db/postgres';
import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema, money, userSchema } from '@/lib/validation';

export async function GET(){try{await requireUser();return ok(await serverDb.getSettings());}catch(e){return fail(e);}}
export async function POST(req:Request){try{await requireUser(true);return ok(await serverDb.saveSettings(await readBody(req)));}catch(e){return fail(e);}}
