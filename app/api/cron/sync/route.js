import { NextResponse } from 'next/server';
import { syncWeather, syncBright } from '../../../../lib/sync.js';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get('authorization')!=='Bearer '+secret)return NextResponse.json({error:'Unauthorised'},{status:401});
  const values=await Promise.allSettled([syncWeather(),syncBright()]);
  const [weather,bright]=values.map(x=>x.status==='fulfilled'?x.value:{status:'error',message:String(x.reason?.message||'Failed')});
  return NextResponse.json({weather,bright},{status:values.some(x=>x.status==='rejected')?207:200});
}
