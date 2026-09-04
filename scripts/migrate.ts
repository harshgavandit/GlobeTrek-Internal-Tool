import { loadEnvConfig } from '@next/env';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { getPool } from '../src/lib/db/pool';
import { EMPTY_SETTINGS } from '../src/lib/default-settings';
loadEnvConfig(process.cwd());
async function main(){
 const c=await getPool().connect();
 try {
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(716238)');
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of (await fs.readdir('database/migrations')).filter(n=>n.endsWith('.sql')).sort()){
   const sql=await fs.readFile('database/migrations/'+name,'utf8');const hash=createHash('sha256').update(sql).digest('hex');
   const prior=(await c.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];
   if(prior){if(prior.checksum!==hash)throw new Error('Migration checksum mismatch: '+name);continue;}
   await c.query(sql);await c.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,hash]);console.log('Applied',name);
  }
  await c.query("INSERT INTO company_settings(id,data) VALUES('company',$1) ON CONFLICT DO NOTHING",[JSON.stringify(EMPTY_SETTINGS)]);
  await c.query('COMMIT');console.log('Migrations verified.');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();await getPool().end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
