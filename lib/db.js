import { neon } from '@neondatabase/serverless';

export function db() {
  if (!process.env.DATABASE_URL) throw Error('Database not configured');
  return neon(process.env.DATABASE_URL);
}
export async function getDashboard() {
  const sql = db();
  const [totals, latest, programmes, experiments, tariffs, daily] = await Promise.all([
    sql.query("WITH first_positive AS (\n  SELECT source,metric,MIN(ts) FILTER (WHERE value > 0) AS first_time\n  FROM energy_readings\n  WHERE metric IN ('grid.import_kwh','gas.import_kwh')\n    AND quality='observed' AND ts<=now()\n  GROUP BY source,metric\n  HAVING COUNT(*) FILTER (WHERE value > 0)>0\n) SELECT e.metric, ROUND(SUM(e.value)::numeric,1)::float AS kwh\n  FROM energy_readings e JOIN first_positive f ON e.source=f.source AND e.metric=f.metric\n  WHERE e.quality='observed' AND e.ts>=f.first_time AND e.ts>=now()-interval '7 days' AND e.ts<=now()\n  GROUP BY e.metric"),
    sql.query("SELECT metric, count(*)::int AS count, max(ts)::text AS latest FROM energy_readings GROUP BY metric ORDER BY metric"),
    sql.query("SELECT DISTINCT ON (system,day_group) id,system,day_group,periods,thermostat_target_c::float,boiler_flow_c::float,note,recorded_at::text FROM programme_history ORDER BY system,day_group,recorded_at DESC,id DESC"),
    sql.query("SELECT id,started_at::text,category,change_description,hypothesis,comfort_notes FROM experiments ORDER BY started_at DESC LIMIT 15"),
    sql.query("SELECT DISTINCT ON (fuel) fuel,price_p_per_kwh::float,standing_p_per_day::float,valid_from::text FROM tariff_rates WHERE valid_from<=CURRENT_DATE ORDER BY fuel,valid_from DESC"),
    sql.query("WITH first_positive AS (\n  SELECT source,metric,MIN(ts) FILTER (WHERE value > 0) AS first_time\n  FROM energy_readings\n  WHERE metric IN ('grid.import_kwh','gas.import_kwh')\n    AND quality='observed' AND ts<=now()\n  GROUP BY source,metric\n  HAVING COUNT(*) FILTER (WHERE value > 0)>0\n) SELECT e.metric, (e.ts AT TIME ZONE 'Europe/London')::date::text AS day,\n  SUM(e.value)::float AS kwh\n  FROM energy_readings e JOIN first_positive f ON e.source=f.source AND e.metric=f.metric\n  WHERE e.quality='observed' AND e.ts>=f.first_time AND e.ts>=now()-interval '14 days' AND e.ts<=now()\n  GROUP BY e.metric,day ORDER BY day")
  ]);
  const syncRuns = await sql.query("SELECT DISTINCT ON (source) source,status,imported,message,started_at::text FROM ingestion_runs ORDER BY source,started_at DESC,id DESC");
  const weatherNow=await sql.query("SELECT DISTINCT ON (metric) metric,value::float AS value,ts::text AS ts,quality FROM energy_readings WHERE source='open-meteo' AND metric IN ('outdoor.temperature_c','solar.irradiance_wm2') AND ts <= now() ORDER BY metric,ts DESC");
  const weatherAhead=await sql.query("SELECT ts::text AS ts, value::float AS value FROM energy_readings WHERE source='open-meteo' AND metric='outdoor.temperature_c' AND ts > now() AND ts < now()+interval '12 hours' ORDER BY ts LIMIT 12");
  const meterQuality=await sql.query("SELECT metric, COUNT(*)::int AS stored, COUNT(*) FILTER (WHERE value > 0 AND ts<=now())::int AS nonzero, MAX(ts) FILTER (WHERE value > 0 AND ts<=now())::text AS latest_valid FROM energy_readings WHERE source LIKE 'bright:%' AND metric IN ('grid.import_kwh','gas.import_kwh') AND quality='observed' GROUP BY metric ORDER BY metric");
  return {totals,latest,programmes,experiments,tariffs,daily,syncRuns,weatherNow,weatherAhead,meterQuality};
}
export async function saveReadings(readings) {
  if (!readings.length) return 0;
  const sql = db();
  // One atomic PostgreSQL statement for a whole batch, rather than hundreds of
  // serverless HTTP round-trips. Upserts make repeated backfills safe.
  const payload = readings.map(r => ({
    source:r.source, metric:r.metric, ts:r.ts,
    value:Number(r.value), unit:r.unit,
    quality:r.quality||'observed',
    metadata:r.metadata||{}
  }));
  const rows = await sql.query(
    "INSERT INTO energy_readings (source,metric,ts,value,unit,quality,metadata) " +
    "SELECT source,metric,ts,value,unit,quality,metadata " +
    "FROM jsonb_to_recordset($1::jsonb) AS r(source text,metric text,ts timestamptz,value numeric,unit text,quality text,metadata jsonb) " +
    "ON CONFLICT (source,metric,ts) DO UPDATE SET value=EXCLUDED.value,unit=EXCLUDED.unit,quality=EXCLUDED.quality,metadata=EXCLUDED.metadata,ingested_at=now() " +
    "RETURNING source", [JSON.stringify(payload)]
  );
  return rows.length;
}

export async function recordSync(source,status,imported=0,message='') {
  const sql=db();
  await sql.query(
    "INSERT INTO ingestion_runs (source,status,imported,message) VALUES ($1,$2,$3,$4)",
    [source,status,imported,String(message).slice(0,240)]
  );
}
