import {loadEnvConfig} from '@next/env';
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Pool} from 'pg';
import bcrypt from 'bcryptjs';
loadEnvConfig(process.cwd());
async function main(){
 const url=new URL(process.env.TEST_DATABASE_URL||process.env.DATABASE_URL||'');url.pathname='/globetrek_acceptance';
 const file='tmp/audit/test-env.json';mkdirSync('tmp/audit',{recursive:true});
 if(existsSync(file)){console.log('Existing isolated acceptance configuration retained.');return;}
 const pool=new Pool({connectionString:url.toString(),connectionTimeoutMillis:5000});
 try{
  await pool.query('SELECT 1');
  const env={DATABASE_URL:url.toString(),APP_URL:process.env.TEST_APP_URL||'http://localhost:3001',adminEmail:'acceptance.admin@globetrek.test',adminPassword:randomBytes(24).toString('base64url'),teamEmail:'acceptance.team@globetrek.test',teamPassword:randomBytes(24).toString('base64url')};
  execFileSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/migrate.ts'],{stdio:'inherit',env:{...process.env,...env}});
  for(const [email,password,name,role] of [[env.adminEmail,env.adminPassword,'Acceptance Administrator','admin'],[env.teamEmail,env.teamPassword,'Acceptance Team Member','team_member']]){
   if((await pool.query('SELECT 1 FROM users WHERE email=$1',[email])).rowCount)throw Error('Acceptance users already exist but their local credentials file is missing. Use a fresh dedicated test database or restore that file.');
   await pool.query('INSERT INTO users(email,password_hash,full_name,role) VALUES($1,$2,$3,$4)',[email,await bcrypt.hash(password,12),name,role]);
  }
  writeFileSync(file,JSON.stringify(env,null,2),{mode:0o600});console.log('Isolated acceptance users created. Credentials are stored only in ignored tmp/audit/test-env.json.');
 }finally{await pool.end();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
