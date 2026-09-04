import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { getPool } from '../db/pool';
import { AppError } from '../validation';
import { UserProfile } from '@/types';
export const SESSION_COOKIE_NAME='globetrek_session_token';
const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const hashPassword=(plain:string)=>bcrypt.hash(plain,12);
export const verifyPassword=(plain:string,hash:string)=>bcrypt.compare(plain,hash);
export async function createSession(user:UserProfile){
 const token=randomBytes(32).toString('hex');const store=await cookies();
 const previous=store.get(SESSION_COOKIE_NAME)?.value;
 if(previous)await getPool().query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(previous)]);
 await getPool().query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",[tokenHash(token),user.id]);
 const url=process.env.APP_URL;
 if(process.env.NODE_ENV==='production' && (!url||(!url.startsWith('https://')&&!/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(url))))throw new Error('Production APP_URL requires HTTPS (loopback only is permitted for local verification)');
 store.set(SESSION_COOKIE_NAME,token,{httpOnly:true,secure:url?.startsWith('https://')??false,sameSite:'lax',path:'/',maxAge:43200});
}
export async function getSessionUser():Promise<UserProfile|null>{
 const token=(await cookies()).get(SESSION_COOKIE_NAME)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const r=(await getPool().query('SELECT u.id,u.email,u.full_name,u.role,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE token_hash=$1 AND s.expires_at>now() AND u.is_active',[tokenHash(token)])).rows[0];return r?JSON.parse(JSON.stringify(r)):null;
}
export async function requireUser(admin=false){const user=await getSessionUser();if(!user)throw new AppError(401,'Sign in to continue');if(admin&&user.role!=='admin')throw new AppError(403,'Administrator permission required');return user;}
export async function clearSession(){const store=await cookies();const token=store.get(SESSION_COOKIE_NAME)?.value;if(token)await getPool().query('DELETE FROM sessions WHERE token_hash=$1',[tokenHash(token)]);store.delete(SESSION_COOKIE_NAME);}
