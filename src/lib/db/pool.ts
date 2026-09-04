import { Pool, PoolClient } from 'pg';
let instance: Pool | undefined;
export function getPool() {
 if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; no fallback storage is permitted.');
 if (process.env.NODE_ENV === 'production' && !process.env.APP_URL) throw new Error('APP_URL is required in production.');
 if (!instance) instance = new Pool({connectionString:process.env.DATABASE_URL, max:10, connectionTimeoutMillis:5000,
  ssl:process.env.PGSSL === 'require' ? {rejectUnauthorized:true} : undefined});
 return instance;
}
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T> {
 const client=await getPool().connect();
 try { await client.query('BEGIN'); const result=await fn(client); await client.query('COMMIT'); return result; }
 catch(error) {await client.query('ROLLBACK'); throw error;} finally {client.release();}
}
// All catalog writers share this lock, so import previews cannot race direct edits.
export async function catalogLock(client:PoolClient) {await client.query('SELECT pg_advisory_xact_lock(716239)');}
