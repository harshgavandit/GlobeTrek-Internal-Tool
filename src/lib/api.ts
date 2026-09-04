import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './validation';

function isLoopbackHost(hostname:string){
 return hostname==='localhost'||hostname==='127.0.0.1'||hostname==='[::1]'||hostname==='::1';
}

/**
 * Protect mutating endpoints from cross-site requests without making a local
 * application unusable when it is opened on a different loopback port.
 *
 * Hosted environments remain pinned to APP_URL.  A loopback request may use
 * its own origin because developer tooling and local reverse proxies commonly
 * select a port independently from APP_URL.
 */
export function checkOrigin(req:Request){
 const origin=req.headers.get('origin');
 const requestUrl=new URL(req.url);
 const configuredUrl=process.env.APP_URL?new URL(process.env.APP_URL):undefined;
 const configuredOrigin=configuredUrl?.origin;
 const allowLocalRequestOrigin=isLoopbackHost(requestUrl.hostname)&&(!configuredUrl||isLoopbackHost(configuredUrl.hostname));
 const allowedOrigins=new Set([configuredOrigin,allowLocalRequestOrigin?requestUrl.origin:undefined].filter((value):value is string=>Boolean(value)));

 if(origin&&!allowedOrigins.has(origin))throw new AppError(403,'Cross-origin writes are forbidden');
 if(req.headers.get('sec-fetch-site')==='cross-site')throw new AppError(403,'Cross-site writes are forbidden');
}
export async function readBody(req:Request){
 checkOrigin(req);
 if(!req.headers.get('content-type')?.includes('application/json'))throw new AppError(415,'JSON content type required');
 const reader=req.body?.getReader();if(!reader)throw new AppError(400,'JSON body required');
 const chunks:Uint8Array[]=[];let bytes=0;
 try {while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>1000000){await reader.cancel();throw new AppError(413,'Request too large');}chunks.push(part.value);}}finally{reader.releaseLock();}
 const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new AppError(400,'JSON object required');return value;
}
export function ok(data:unknown){return NextResponse.json({success:true,data},{headers:{'Cache-Control':'no-store'}});}
export function fail(error:unknown){
 if(error instanceof AppError)return NextResponse.json({success:false,error:error.message},{status:error.status});
 if(error instanceof ZodError)return NextResponse.json({success:false,error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});
 if(error instanceof SyntaxError)return NextResponse.json({success:false,error:'Invalid JSON'},{status:400});
 const code=(error as {code?:string})?.code;
 if(code==='23505')return NextResponse.json({success:false,error:'A record with this name, email or SKU already exists'},{status:409});
 if(code==='23503')return NextResponse.json({success:false,error:'Record is referenced by other data or a referenced record does not exist'},{status:409});
 console.error('Request failed:',error instanceof Error?error.message:'Unknown error');
 return NextResponse.json({success:false,error:'Server or database unavailable. Please retry; no fallback data is used.'},{status:503});
}
