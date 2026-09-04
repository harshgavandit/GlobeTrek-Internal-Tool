import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const env=JSON.parse(readFileSync('tmp/audit/test-env.json','utf8'));
if(new URL(env.DATABASE_URL).pathname!=='/globetrek_acceptance')throw Error('Acceptance server requires its isolated database');
const url=new URL(env.APP_URL);
spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',url.port||'3001','--hostname','127.0.0.1'],{stdio:'inherit',env:{...process.env,DATABASE_URL:env.DATABASE_URL,APP_URL:env.APP_URL}}).on('exit',code=>process.exit(code??0));
