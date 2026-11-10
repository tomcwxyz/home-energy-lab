import {NextResponse} from 'next/server';
import {runSync} from '../../../lib/sync.js';
export const runtime='nodejs';
export const maxDuration=120;
// Cookie authentication and same-origin request enforcement are applied by middleware.
export async function POST(){
  return NextResponse.json({sources:await runSync()},{headers:{'Cache-Control':'no-store'}});
}
