'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

async function submit(kind,body){
  const r=await fetch('/api/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,...body})});
  const json=await r.json();
  if(!r.ok)throw Error(json.error||'Could not save');
  return json;
}
function useSave(){
  const router=useRouter(),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  async function save(kind,body,reset){
    setBusy(true);setMessage('');
    try{await submit(kind,body);setMessage('Saved. Your equipment has not been changed.');reset?.();router.refresh();}
    catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  return {save,message,busy};
}
export function ProgrammeForm(){
  const {save,message,busy}=useSave();
  const [system,setSystem]=useState('heating'),[day,setDay]=useState('weekdays');
  return <form className="panel form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);
    const periods=[1,2,3].filter(n=>f.get('enabled'+n)==='on').map(n=>({start:String(f.get('start'+n)),end:String(f.get('end'+n))}));
    save('programme',{system,day_group:day,periods,thermostat_target_c:f.get('thermostat'),boiler_flow_c:f.get('flow'),note:f.get('note')});
  }}>
    <div className="split"><div className="field"><label htmlFor="sys">System</label><select id="sys" value={system} onChange={e=>setSystem(e.target.value)}><option value="heating">Central heating</option><option value="hot_water">Gas hot water</option></select></div>
      <div className="field"><label htmlFor="days">Days</label><select id="days" value={day} onChange={e=>setDay(e.target.value)}><option value="weekdays">Weekdays</option><option value="weekends">Weekends</option><option value="all">Every day</option></select></div></div>
    <p className="note">Tick the on/off periods actually set on the Danfoss. An unticked period is ignored.</p>
    {[1,2,3].map(n=><div className="period" key={n}><label><input type="checkbox" name={'enabled'+n}/> Period {n}</label><input type="time" aria-label={'Start of period '+n} name={'start'+n}/><span>to</span><input type="time" aria-label={'End of period '+n} name={'end'+n}/></div>)}
    {system==='heating'&&<div className="split"><div className="field"><label htmlFor="thermo">Room thermostat (°C)</label><input id="thermo" name="thermostat" type="number" step=".5" min="5" max="35" placeholder="Optional" /></div><div className="field"><label htmlFor="flow">Boiler flow (°C)</label><input id="flow" name="flow" type="number" min="30" max="90" placeholder="Optional" /></div></div>}
    <div className="field"><label htmlFor="pnote">Notes</label><input id="pnote" name="note" maxLength="500" placeholder="What have you changed?"/></div>
    <button disabled={busy}>{busy?'Saving…':'Record programme'}</button><p role="status" className="note">{message}</p>
  </form>;
}
export function ExperimentForm(){
  const {save,message,busy}=useSave();
  return <form className="panel form" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const el=e.currentTarget;
      save('experiment',Object.fromEntries(f),()=>el.reset());}}>
    <div className="field"><label htmlFor="cat">System</label><select id="cat" name="category"><option value="heating">Central heating</option><option value="hot_water">Hot water</option><option value="solar">Solar</option><option value="other">Other</option></select></div>
    <div className="field"><label htmlFor="change">What did you change?</label><textarea id="change" name="change_description" minLength="3" maxLength="1000" rows="2" required placeholder="For example, hot-water programme changed from 06:00–07:00 to 06:30–07:00"/></div>
    <div className="field"><label htmlFor="hyp">What do you expect?</label><textarea id="hyp" name="hypothesis" maxLength="1000" rows="2" placeholder="For example, less morning gas use"/></div>
    <div className="field"><label htmlFor="comfort">Comfort and observations</label><input id="comfort" name="comfort_notes" maxLength="1000" placeholder="For example, enough hot water for showers"/></div>
    <button disabled={busy}>{busy?'Saving…':'Record change'}</button><p role="status" className="note">{message}</p>
  </form>;
}
export function TariffForm(){
  const {save,message,busy}=useSave();
  return <form className="panel form" onSubmit={e=>{e.preventDefault();save('tariff',Object.fromEntries(new FormData(e.currentTarget)))}}>
    <div className="field"><label htmlFor="fuel">Fuel</label><select id="fuel" name="fuel"><option value="gas">Gas</option><option value="electricity">Electricity</option></select></div>
    <div className="split"><div className="field"><label htmlFor="unit">Unit rate (p/kWh)</label><input id="unit" name="price_p_per_kwh" inputMode="decimal" type="number" min="0" max="300" step=".001" required /></div>
      <div className="field"><label htmlFor="standing">Standing charge (p/day)</label><input id="standing" name="standing_p_per_day" inputMode="decimal" type="number" min="0" max="500" step=".001" required /></div></div>
    <div className="field"><label htmlFor="from">Effective from</label><input id="from" name="valid_from" type="date" required /></div>
    <button disabled={busy}>{busy?'Saving…':'Save tariff'}</button><p role="status" className="note">{message}</p>
  </form>;
}
