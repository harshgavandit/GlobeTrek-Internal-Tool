import {loadEnvConfig} from '@next/env';
import {getPool} from '../src/lib/db/pool';
import {serverDb} from '../src/lib/db/postgres';
import bcrypt from 'bcryptjs';
import {userSchema} from '../src/lib/validation';
loadEnvConfig(process.cwd());
async function main(){
 const user=userSchema.parse({full_name:process.env.ADMIN_NAME||'Administrator',email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD,role:'admin'});
 if((await getPool().query("SELECT 1 FROM users WHERE role='admin' AND is_active")).rowCount)throw new Error('An active administrator already exists. Bootstrap does not overwrite credentials.');
 await serverDb.createUser({...user,password_hash:await bcrypt.hash(user.password,12)});console.log('Administrator created. No demo data was inserted.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>getPool().end());
