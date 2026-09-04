import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverDb } from '@/lib/db/postgres';
import { getPool } from '@/lib/db/pool';
import { createSession,verifyPassword } from '@/lib/auth';
import { readBody,fail } from '@/lib/api';
import { AppError } from '@/lib/validation';
// Constant-time comparison for unknown accounts; never authenticates an account.
const unknownAccountHash='$2b$12$GsfQudkpdh20.wSopDMLPe8nHu2fD9upBKZRbD11tzs.8gpZtiGNa';
export async function POST(req:Request){try{
 const b=z.object({email:z.string().trim().email().max(254),password:z.string().min(1).max(72).refine(v=>Buffer.byteLength(v,'utf8')<=72,'Password exceeds 72 UTF-8 bytes')}).parse(await readBody(req));
 const key=b.email.toLowerCase();
 const a=(await getPool().query("INSERT INTO login_attempts(key,attempts,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE login_attempts.attempts+1 END,window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE login_attempts.window_start END RETURNING attempts",[key])).rows[0];
 if(a.attempts>10)throw new AppError(429,'Too many login attempts. Try again in 15 minutes.');
 const user=await serverDb.getUserByEmail(key);const valid=await verifyPassword(b.password,user?.password_hash||unknownAccountHash);
 if(!user||!valid)throw new AppError(401,'Invalid email or password');
 await getPool().query('DELETE FROM login_attempts WHERE key=$1',[key]);
 const profile={id:user.id,email:user.email,full_name:user.full_name,role:user.role,created_at:user.created_at};
 await createSession(profile);return NextResponse.json({success:true,user:profile});
}catch(e){return fail(e);}}
