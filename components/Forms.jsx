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
const weekDays=[
  ['1','Monday'],['2','Tuesday'],['3','Wednesday'],['4','Thursday'],
  ['5','Friday'],['6','Saturday'],['7','Sunday']
];
export function ProgrammeForm({current=[]}){
  const {save,message,busy}=useSave();
  const [system,setSystem]=useState('heating'),[day,setDay]=useState('1');
  const selected=current.find(x=>x.system===system && Number(x.day_of_week)===Number(day));
  const existing=Array.isArray(selected?.periods)?selected.periods:[];
  return <div className="panel">
    <div className="split">
      <div className="field"><label htmlFor="sys">System</label><select id="sys" value={system} onChange={e=>setSystem(e.target.value)}><option value="heating">Central heating</option><option value="hot_water">Gas hot water</option></select></div>
      <div className="field"><label htmlFor="days">Day</label><select id="days" value={day} onChange={e=>setDay(e.target.value)}>{weekDays.map(([n,label])=><option key={n} value={n}>{label}</option>)}</select></div>
    </div>
    <p className="note">Editing the programme here records the settings you have made on the Danfoss. It does not change the boiler.</p>
    <form className="form" key={system+'-'+day+'-'+selected?.id} onSubmit={e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);
      const periods=[1,2,3].filter(n=>f.get('enabled'+n)==='on').map(n=>({start:String(f.get('start'+n)),end:String(f.get('end'+n))}));
      save('daily_programme',{system,day_of_week:Number(day),periods,note:f.get('note')});
    }}>
      {[1,2,3].map(n=><div className="period" key={n}>
        <label><input type="checkbox" name={'enabled'+n} defaultChecked={Boolean(existing[n-1])}/> Period {n}</label>
        <input type="time" aria-label={'Start of period '+n} name={'start'+n} defaultValue={existing[n-1]?.start||''}/>
        <span>to</span>
        <input type="time" aria-label={'End of period '+n} name={'end'+n} defaultValue={existing[n-1]?.end||''}/>
      </div>)}
      <div className="field"><label htmlFor="pnote">Change note</label><input id="pnote" name="note" maxLength="500" placeholder="What did you change, and why?"/></div>
      {selected?.review_status==='partly_inferred'&&<p className="uncertain">This programme contains an inferred time from the video. Check it against the programmer before using it as a confirmed baseline.</p>}
      <button disabled={busy}>{busy?'Saving…':'Record current settings'}</button><p role="status" className="note">{message}</p>
    </form>
  </div>;
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
