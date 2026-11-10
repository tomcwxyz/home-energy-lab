/**
 * Parse a single Hildebrand Bright PT30M consumption resource.
 *
 * Some enrolled-but-not-ready resources return a perfectly regular run
 * of zero-valued intervals, including intervals in the future. These
 * must not be treated as evidence that the house consumed 0 kWh.
 *
 * We deliberately quarantine all-zero responses and ignore future
 * intervals. A stream becomes usable once it has a positive kWh value.
 * Zeros after that first positive may be legitimate and are retained.
 * Earlier zero-only days must not be used for baseline calculations.
 */
export function normaliseBrightIntervals(data, {
  source, metric, resourceId, now = Date.now()
}) {
  if (!Array.isArray(data)) throw new Error('Bright readings are not an array');
  const samples = [];
  let invalid = 0;
  let future = 0;

  for (const row of data) {
    if (!Array.isArray(row) || row.length < 2) { invalid++; continue; }
    const [epoch, rawValue] = row;
    // Empty strings, nulls and booleans are not zero-valued measurements.
    if (rawValue === null || rawValue === undefined ||
        typeof rawValue === 'boolean' ||
        (typeof rawValue === 'string' && !rawValue.trim())) { invalid++; continue; }
    const value = Number(rawValue);
    const timestamp = Number(epoch) * 1000;
    if (!Number.isFinite(value) || value < 0 ||
        !Number.isFinite(timestamp) ||
        timestamp < Date.parse('2020-01-01')) { invalid++; continue; }
    if (timestamp > now) { future++; continue; }
    samples.push({
      source, metric, unit: 'kWh',
      ts: new Date(timestamp).toISOString(), value,
      quality: 'observed',
      metadata: { period: 'PT30M', resourceId }
    });
  }

  samples.sort((a,b)=>a.ts.localeCompare(b.ts));
  const positive = samples.filter(x=>x.value > 0);
  const zeroCount = samples.length - positive.length;

  if (!positive.length) return {
    status: 'waiting',
    reason: samples.length ? 'all_zero' : 'no_data',
    readings: [], received: data.length,
    zeros: zeroCount, positive: 0, future, invalid
  };

  const firstPositive = positive[0].ts;
  const readings = samples.filter(x=>x.ts >= firstPositive);
  return {
    status: 'ok', reason: null, readings,
    received: data.length, zeros: zeroCount,
    positive: positive.length, future, invalid
  };
}
