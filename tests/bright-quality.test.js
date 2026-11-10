import test from 'node:test';
import assert from 'node:assert/strict';
import {normaliseBrightIntervals} from '../lib/bright-quality.js';

const cfg={source:'bright:test',metric:'grid.import_kwh',resourceId:'r1',now:1794324000000};
const time=Math.floor(Date.parse('2026-11-09T00:00:00Z')/1000);
test('zero-only response is pending, never imported as genuine consumption',()=>{
  const result=normaliseBrightIntervals([[time,0],[time+1800,0]],cfg);
  assert.equal(result.status,'waiting');
  assert.equal(result.reason,'all_zero');
  assert.equal(result.readings.length,0);
  assert.equal(result.zeros,2);
});
test('retain genuine zeros after first positive and skip earlier placeholder intervals',()=>{
  const r=normaliseBrightIntervals([[time,0],[time+1800,0.31],[time+3600,0]],cfg);
  assert.equal(r.status,'ok');
  assert.equal(r.readings.length,2);
  assert.deepEqual(r.readings.map(x=>x.value),[0.31,0]);
});
test('reject future timestamps and invalid empty entries',()=>{
  const future=Math.floor(cfg.now/1000)+1800;
  const r=normaliseBrightIntervals([[time,''],[time,null],[time,false],[future,0.6],[time+1800,0.2]],cfg);
  assert.equal(r.readings.length,1);
  assert.equal(r.future,1);
  assert.equal(r.invalid,3);
  assert.equal(r.readings[0].value,0.2);
});
test('allow gas intervals with legitimate zero readings between usage',()=>{
  const r=normaliseBrightIntervals([[time,1.7],[time+1800,0],[time+3600,2.4]],{...cfg,metric:'gas.import_kwh'});
  assert.deepEqual(r.readings.map(x=>x.value),[1.7,0,2.4]);
});
test('missing data is waiting, not observed zero',()=>{
  const r=normaliseBrightIntervals([] ,cfg);
  assert.equal(r.reason,'no_data');
  assert.equal(r.status,'waiting');
});
