import test from 'node:test';
import assert from 'node:assert/strict';
import { checkOrigin } from '../src/lib/api';

const originalAppUrl=process.env.APP_URL;

function request(url:string,origin?:string,fetchSite?:string){
 const headers=new Headers();
 if(origin)headers.set('origin',origin);
 if(fetchSite)headers.set('sec-fetch-site',fetchSite);
 return new Request(url,{method:'POST',headers});
}

test('same-origin loopback writes work when the local port differs from APP_URL',()=>{
 process.env.APP_URL='http://localhost:3001';
 assert.doesNotThrow(()=>checkOrigin(request('http://localhost:3000/api/auth/login','http://localhost:3000','same-origin')));
});

test('hosted deployments accept only their configured origin',()=>{
 process.env.APP_URL='https://quotes.globetrek.example';
 assert.doesNotThrow(()=>checkOrigin(request('https://quotes.globetrek.example/api/auth/login','https://quotes.globetrek.example','same-origin')));
 assert.throws(()=>checkOrigin(request('https://quotes.globetrek.example/api/auth/login','https://evil.example','cross-site')),/Cross-origin writes are forbidden/);
});

test('loopback origin checks still reject non-loopback attackers',()=>{
 process.env.APP_URL='http://localhost:3001';
 assert.throws(()=>checkOrigin(request('http://localhost:3000/api/auth/login','https://evil.example','cross-site')),/Cross-origin writes are forbidden/);
});

test.after(()=>{
 if(originalAppUrl===undefined)delete process.env.APP_URL;
 else process.env.APP_URL=originalAppUrl;
});
