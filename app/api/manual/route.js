import { NextResponse } from 'next/server';
import { db } from '../../../lib/db.js';
export const runtime='nodejs';

function optionalTemperature(value,min,max){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);
  if(!Number.isFinite(n)||n<min||n>max)throw Error('Temperature outside allowed range');
  return n;
}
function validatePeriods(input){
  if(!Array.isArray(input)||input.length>3)throw Error('Use up to three periods');
  let last=-1;
  return input.map(p=>{
    if(!/^\d{2}:\d{2}$/.test(p.start)||!/^\d{2}:\d{2}$/.test(p.end))throw Error('Enter valid times');
    const toMinutes=s=>{const[h,m]=s.split(':').map(Number);if(h>23||m>59)throw Error('Invalid time');return h*60+m};
    const start=toMinutes(p.start),end=toMinutes(p.end);
    if(start>=end||start<last)throw Error('Periods must be ordered, not overlap and finish the same day');
    last=end;
    return {start:p.start,end:p.end};
  });
}
export async function POST(request){
  let d;
  try{d=await request.json()}catch{return NextResponse.json({error:'Invalid JSON'},{status:400})}
  try{
    const sql=db();
    if(d.kind==='daily_programme'){
      if(!['heating','hot_water'].includes(d.system)||!Number.isInteger(d.day_of_week)||d.day_of_week<1||d.day_of_week>7)throw Error('Invalid day or system');
      const periods=validatePeriods(d.periods);
      const note=String(d.note||'').trim();
      if(note.length>500)throw Error('Notes too long');
      await sql.query("INSERT INTO programme_daily_history(system,day_of_week,periods,source,review_status,note) VALUES ($1,$2,$3::jsonb,'manual','confirmed',$4)",
        [d.system,d.day_of_week,JSON.stringify(periods),note]);
    }else if(d.kind==='programme'){
      if(!['heating','hot_water'].includes(d.system)||!['all','weekdays','weekends'].includes(d.day_group))throw Error('Invalid programme');
      const periods=validatePeriods(d.periods);
      const note=String(d.note||'').trim();
      if(note.length>500)throw Error('Notes too long');
      const target=d.system==='heating'?optionalTemperature(d.thermostat_target_c,5,35):null;
      const flow=d.system==='heating'?optionalTemperature(d.boiler_flow_c,30,90):null;
      await sql.query('INSERT INTO programme_history(system,day_group,periods,thermostat_target_c,boiler_flow_c,note) VALUES ($1,$2,$3::jsonb,$4,$5,$6)',[d.system,d.day_group,JSON.stringify(periods),target,flow,note]);
    }else if(d.kind==='experiment'){
      if(!['heating','hot_water','solar','other'].includes(d.category))throw Error('Invalid category');
      const change=String(d.change_description||'').trim();
      const hypothesis=String(d.hypothesis||'').trim();
      const comfort=String(d.comfort_notes||'').trim();
      if(change.length<3||change.length>1000||hypothesis.length>1000||comfort.length>1000)throw Error('Invalid change description');
      await sql.query('INSERT INTO experiments(category,change_description,hypothesis,comfort_notes) VALUES ($1,$2,$3,$4)',[d.category,change,hypothesis,comfort]);
    }else if(d.kind==='tariff'){
      if(!['gas','electricity'].includes(d.fuel))throw Error('Invalid fuel');
      const unit=Number(d.price_p_per_kwh),standing=Number(d.standing_p_per_day);
      if(!Number.isFinite(unit)||unit<0||unit>300||!Number.isFinite(standing)||standing<0||standing>500||!/^\d{4}-\d{2}-\d{2}$/.test(d.valid_from)||!Number.isFinite(Date.parse(d.valid_from)))throw Error('Invalid tariff');
      await sql.query('INSERT INTO tariff_rates(fuel,price_p_per_kwh,standing_p_per_day,valid_from) VALUES ($1,$2,$3,$4) ON CONFLICT (fuel,valid_from) DO UPDATE SET price_p_per_kwh=EXCLUDED.price_p_per_kwh,standing_p_per_day=EXCLUDED.standing_p_per_day',[d.fuel,unit,standing,d.valid_from]);
    }else throw Error('Unknown entry type');
    return NextResponse.json({saved:true},{status:201});
  }catch(e){
    if(e.message==='Database not configured')return NextResponse.json({error:'Database not connected'},{status:503});
    if(/^(Invalid|Use |Enter |Periods|Notes|Temperature|Unknown)/.test(e.message))return NextResponse.json({error:e.message},{status:400});
    return NextResponse.json({error:'Could not save entry'},{status:500});
  }
}
