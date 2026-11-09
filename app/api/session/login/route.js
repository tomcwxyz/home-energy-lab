import { NextResponse } from 'next/server';
import { constantTimeEqual,createSession,COOKIE,SESSION_AGE } from '../../../../lib/session.js';
export const runtime='nodejs';
export async function POST(request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Invalid origin'},{status:403});
  const {DASHBOARD_USER:user,DASHBOARD_PASSWORD:pass,SESSION_SECRET:secret}=process.env;
  if(!user||!pass||!secret||secret.length<32)return NextResponse.json({error:'Sign-in not configured'},{status:503});
  let body;
  try{body=await request.json()}catch{return NextResponse.json({error:'Invalid request'},{status:400})}
  if(typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>128||body.password.length>256)return NextResponse.json({error:'Invalid credentials'},{status:401});
  const [u,p]=await Promise.all([constantTimeEqual(body.username,user),constantTimeEqual(body.password,pass)]);
  if(!u||!p)return NextResponse.json({error:'Incorrect username or password'},{status:401,headers:{'Cache-Control':'no-store'}});
  const token=await createSession(secret);
  const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  response.cookies.set(COOKIE,token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:SESSION_AGE,path:'/'});
  return response;
}
