import {NextResponse} from 'next/server';
import {runSync} from '../../../../lib/sync.js';
export const runtime='nodejs';
export const maxDuration=120;
export async function GET(request){
  const secret=process.env.CRON_SECRET;
  if(!secret||request.headers.get('authorization')!=='Bearer '+secret) return NextResponse.json({error:'Unauthorised'},{status:401});
  const sources=await runSync();
  return NextResponse.json({sources},{headers:{'Cache-Control':'no-store'}});
}
