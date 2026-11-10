import { NextResponse } from 'next/server';
import {COOKIE} from '../../../../lib/session.js';
export async function POST(request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  const res=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  res.cookies.set(COOKIE,'',{maxAge:0,path:'/',httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production'});
  return res;
}
