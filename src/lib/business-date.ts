// Globetrek quotation dates follow India Standard Time on both client and server.
export function businessDate(dayOffset=0,now=new Date()):string {
 return new Date(now.getTime()+330*60000+dayOffset*86400000).toISOString().slice(0,10);
}
