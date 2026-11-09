import { neon } from '@neondatabase/serverless';

export function db() {
  if (!process.env.DATABASE_URL) throw Error('Database not configured');
  return neon(process.env.DATABASE_URL);
}
export async function getDashboard() {
  const sql = db();
  const [totals, latest, programmes, experiments, tariffs, daily] = await Promise.all([
    sql.query("SELECT metric, ROUND(SUM(value)::numeric,1)::float AS kwh FROM energy_readings WHERE metric IN ('grid.import_kwh','gas.import_kwh') AND quality='observed' AND ts >= now()-interval '7 days' GROUP BY metric"),
    sql.query("SELECT metric, count(*)::int AS count, max(ts)::text AS latest FROM energy_readings GROUP BY metric ORDER BY metric"),
    sql.query("SELECT DISTINCT ON (system,day_group) id,system,day_group,periods,thermostat_target_c::float,boiler_flow_c::float,note,recorded_at::text FROM programme_history ORDER BY system,day_group,recorded_at DESC,id DESC"),
    sql.query("SELECT id,started_at::text,category,change_description,hypothesis,comfort_notes FROM experiments ORDER BY started_at DESC LIMIT 15"),
    sql.query("SELECT DISTINCT ON (fuel) fuel,price_p_per_kwh::float,standing_p_per_day::float,valid_from::text FROM tariff_rates WHERE valid_from<=CURRENT_DATE ORDER BY fuel,valid_from DESC"),
    sql.query("SELECT metric, (ts AT TIME ZONE 'Europe/London')::date::text AS day, SUM(value)::float AS kwh FROM energy_readings WHERE metric IN ('grid.import_kwh','gas.import_kwh') AND quality='observed' AND ts>=now()-interval '14 days' GROUP BY metric, day ORDER BY day")
  ]);
  return {totals,latest,programmes,experiments,tariffs,daily};
}
export async function saveReadings(readings) {
  const sql=db();
  let saved=0;
  for (const r of readings) {
    await sql.query("INSERT INTO energy_readings (source,metric,ts,value,unit,quality,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT (source,metric,ts) DO UPDATE SET value=EXCLUDED.value,unit=EXCLUDED.unit,quality=EXCLUDED.quality,metadata=EXCLUDED.metadata,ingested_at=now()",[r.source,r.metric,r.ts,r.value,r.unit,r.quality||'observed',JSON.stringify(r.metadata||{})]);
    saved++;
  }
  return saved;
}
