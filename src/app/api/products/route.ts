import { serverDb } from '@/lib/db/postgres';
import { requireUser } from '@/lib/auth';
import { ok,fail,readBody,checkOrigin } from '@/lib/api';
import { idSchema, money, userSchema } from '@/lib/validation';

export async function GET(req:Request){try{await requireUser();const id=new URL(req.url).searchParams.get('history');return ok(id?await serverDb.getProductPriceHistory(idSchema.parse(id)):await serverDb.getProducts());}catch(e){return fail(e);}}
export async function POST(req:Request){try{const user=await requireUser(true);const b=await readBody(req);if(b.action==='upsert_price'){await serverDb.upsertProductPrice(idSchema.parse(b.productId),idSchema.parse(b.priceListId),money.parse(b.unitPrice),user.id,String(b.reason||'Manual price change').slice(0,500));return ok(null);}return ok(await serverDb.saveProduct(undefined,b,b.prices,user.id));}catch(e){return fail(e);}}
export async function PUT(req:Request){try{const u=await requireUser(true);const b=await readBody(req);return ok(await serverDb.saveProduct(idSchema.parse(b.id),b,b.prices,u.id,b.reason));}catch(e){return fail(e);}}
export async function DELETE(req:Request){try{await requireUser(true);checkOrigin(req);await serverDb.deleteProduct(idSchema.parse(new URL(req.url).searchParams.get('id')));return ok(null);}catch(e){return fail(e);}}
