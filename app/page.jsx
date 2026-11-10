import { getDashboard } from '../lib/db.js';
import {ProgrammeForm,ExperimentForm,TariffForm} from '../components/Forms.jsx';
import SignOut from '../components/SignOut.jsx';
import SyncNow from '../components/SyncNow.jsx';
export const dynamic='force-dynamic';
function Metric({label,value,detail}){return <article className="metric"><div className="eyebrow">{label}</div><div className="large">{value}</div><p>{detail}</p></article>}
function Bars({rows,metric,label}){
  const data=(rows||[]).filter(x=>x.metric===metric).slice(-14);
  const max=Math.max(1,...data.map(x=>Number(x.kwh)));
  return <div className="panel"><h3>{label}</h3>{!data.length?<p className="note">No readings yet.</p>:data.map(x=><div className="bar-row" key={x.day}><span>{x.day.slice(5)}</span><div className="track"><div className={'bar '+(metric==='gas.import_kwh'?'gas':'')} style={{width:(100*x.kwh/max)+'%'}}/></div><strong>{Number(x.kwh).toFixed(1)}</strong></div>)}</div>;
}
export default async function Page(){
  let data=null,error='';
  try{data=await getDashboard()}catch{error='The database is not connected, or its tables are unavailable.'}
  const total=k=>data?.totals?.find(x=>x.metric===k)?.kwh;
  const fmt=k=>total(k)===undefined?'Awaiting data':Number(total(k)).toFixed(1)+' kWh';
  return <main>
    <header className="topbar"><a className="brand" href="#top">Energy Lab</a><nav><a href="#programmes">Programmes</a><a href="#experiments">Changes</a><a href="#tariffs">Tariffs</a></nav><SignOut/></header>
    <section className="masthead" id="top"><div className="eyebrow">HOME ENERGY / PRIVATE ALPHA</div><h1>Understand the house.</h1><p>Measure what we use. Record changes to heating and hot-water settings. Find out what actually works.</p></section>
    {error&&<aside className="setup"><strong>Connection needed</strong><p>{error} The app is private; configure DATABASE_URL in Vercel and run the SQL migrations.</p></aside>}
    <section><h2>Last seven days</h2><div className="metrics">
      <Metric label="Grid electricity" value={fmt('grid.import_kwh')} detail="Imported from the grid; excludes self-consumed solar"/>
      <Metric label="Gas" value={fmt('gas.import_kwh')} detail="Smart-meter gas imports"/>
      <Metric label="Solar diversion" value="Not linked" detail="Will need local power monitoring"/>
    </div></section>
    <section><h2>Weather near Newton Aycliffe</h2><p>Hourly estimates and forecasts from Open-Meteo. These are not readings from your home or from the solar inverter.</p>
      <div className="metrics">
        {[
          ['outdoor.temperature_c','Estimated outside temperature','°C'],
          ['solar.irradiance_wm2','Estimated sunlight on a horizontal surface','W/m²']
        ].map(([metric,label,unit])=>{
          const row=data?.weatherNow?.find(x=>x.metric===metric);
          return <div className="metric" key={metric}><div className="eyebrow">{label}</div><div className="large">{row?Number(row.value).toFixed(1)+' '+unit:'—'}</div><p>{row?'For '+new Date(row.ts).toLocaleString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}):'Not yet imported'}</p></div>;
        })}
        <div className="metric"><div className="eyebrow">Next 12 hours</div>{!data?.weatherAhead?.length?<p>No forecast imported yet</p>:<div>{data.weatherAhead.filter((_,i)=>i%3===0).map(x=><p key={x.ts} className="note">{new Date(x.ts).toLocaleTimeString('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit'})}: {Number(x.value).toFixed(1)}°C</p>)}</div>}</div>
      </div>
    </section>
    <section><h2>Consumption</h2><div className="columns"><Bars label="Gas · kWh/day" metric="gas.import_kwh" rows={data?.daily}/><Bars label="Grid electricity · kWh/day" metric="grid.import_kwh" rows={data?.daily}/></div>
      <p className="note">Smart-meter readings are delayed and are not a measure of useful heat. Comparisons will eventually be adjusted for weather and comfort.</p></section>
    <section id="programmes"><h2>Heating and hot-water programmes</h2><p>Record the settings currently programmed into your Danfoss. This records changes only; it does not operate the boiler.</p>
      <div className="columns"><ProgrammeForm/><div><h3>Latest recorded settings</h3>{!data?.programmes?.length?<p className="muted">Nothing recorded yet.</p>:<ul className="entry-list">{data.programmes.map(p=><li key={p.id}><div className="eyebrow">{p.system==='heating'?'Central heating':'Gas hot water'} · {p.day_group.replace('_',' ')} · {p.recorded_at.slice(0,10)}</div><strong>{p.periods?.length?p.periods.map(x=>x.start+'–'+x.end).join(', '):'Scheduled off'}</strong>{p.thermostat_target_c!==null&&<div>Thermostat: {p.thermostat_target_c}°C</div>}{p.boiler_flow_c!==null&&<div>Flow setting: {p.boiler_flow_c}°C</div>}{p.note&&<p>{p.note}</p>}</li>)}</ul>}<p className="note">Programme on-time is not proof the burner was firing.</p></div></div></section>
    <section id="experiments"><h2>Log a change</h2><p>Change one variable at a time, note comfort, then compare similar weather periods.</p>
      <div className="columns"><ExperimentForm/><div><h3>Recent experiments</h3>{!data?.experiments?.length?<p className="muted">No changes recorded yet.</p>:<ul className="entry-list">{data.experiments.map(e=><li key={e.id}><div className="eyebrow">{e.category.replace('_',' ')} · {e.started_at.slice(0,10)}</div><strong>{e.change_description}</strong>{e.hypothesis&&<p>Expected: {e.hypothesis}</p>}{e.comfort_notes&&<p>Comfort: {e.comfort_notes}</p>}</li>)}</ul>}</div></div></section>
    <section id="tariffs"><h2>Energy tariffs</h2><p>Record your current Fuse import rates. FIT generation and deemed export are accounted for separately.</p>
      <div className="columns"><TariffForm/><div><h3>Current recorded rates</h3>{!data?.tariffs?.length?<p className="muted">No rates recorded yet.</p>:<ul className="entry-list">{data.tariffs.map(t=><li key={t.fuel}><strong>{t.fuel}</strong>: {t.price_p_per_kwh}p/kWh plus {t.standing_p_per_day}p/day, from {t.valid_from.slice(0,10)}</li>)}</ul>}</div></div></section>
    <section><h2>Meter reading quality</h2><p>Bright recognises the account, but registration and usable measurements are separate steps. A series containing nothing but zeros is not enough to establish household consumption.</p>
      <div className="columns">{[['grid.import_kwh','Electricity'],['gas.import_kwh','Gas']].map(([metric,name])=>{
        const q=data?.meterQuality?.find(x=>x.metric===metric);
        return <div className="panel" key={metric}><h3>{name}</h3>
          <p><strong>{q?.nonzero?'Real consumption detected':'Waiting for valid readings'}</strong></p>
          <p className="note">{q?String(q.stored)+' raw records, '+String(q.nonzero)+' with non-zero consumption':'No records returned yet'}</p>
          {q?.latest_valid&&<p className="note">Latest confirmed use: {new Date(q.latest_valid).toLocaleString('en-GB',{timeZone:'Europe/London'})}</p>}
        </div>;
      })}</div>
      <p className="note">Previous zero-only batches are retained for diagnosis, but are excluded from consumption summaries until a genuine measurement is observed.</p>
    </section>
    <section id="sources"><h2>Live data connections</h2><p>Weather data comes from a nearby forecast grid, not a sensor at your house. Smart meters supply delayed actual consumption once your Bright account has been verified.</p>
      <div className="sources">
        {['weather','bright'].map(source=>{
          const run=data?.syncRuns?.find(x=>x.source===source);
          const sourceReadings=(data?.latest||[]).filter(x=>source==='weather'?x.metric.startsWith('outdoor.')||x.metric.startsWith('solar.irradiance'):x.metric.startsWith('gas.')||x.metric.startsWith('grid.'));
          const title=source==='weather'?'Local weather and solar irradiance':'Gas and electricity smart meters';
          return <div className="panel" key={source}><div className="eyebrow">{source==='weather'?'OPEN-METEO':'HILDEBRAND BRIGHT'}</div><h3>{title}</h3><p className="note">Status: <strong>{run?.status||'Not yet checked'}</strong></p>
            <p className="note">{run?.message||'Waiting for first import'}</p>
            <p className="note">Last check: {run?.started_at?new Date(run.started_at).toLocaleString('en-GB',{timeZone:'Europe/London'}):'None yet'}</p>
            <p className="note">{source==='bright'?'Raw records received (not necessarily valid): ':'Stored weather values: '}{sourceReadings.reduce((n,x)=>n+x.count,0)}</p></div>
        })}
      </div><SyncNow/>
      <p className="note">Scheduled refresh: four times daily. The weather feed includes forecasts; consumption charts only use observed smart-meter readings.</p>
    </section>
    <section><h2>Recorded data streams</h2>{!data?.latest?.length?<p className="muted">No readings imported yet.</p>:<div className="sources">{data.latest.map(x=><div className="panel" key={x.metric}><strong>{x.metric}</strong><div>{x.count} readings</div><div className="note">Latest: {new Date(x.latest).toLocaleString('en-GB',{timeZone:'Europe/London'})}</div></div>)}</div>}</section>
    <footer>Home Energy Lab · Private household research · No automatic boiler or immersion control</footer>
    <nav className="mobile-nav"><a href="#top">Overview</a><a href="#programmes">Programme</a><a href="#experiments">Changes</a><a href="#tariffs">Tariffs</a></nav>
  </main>;
}
