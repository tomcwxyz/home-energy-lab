import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession,verifySession,constantTimeEqual} from '../lib/session.js';
const secret='long private test key for hmac signing sessions 123';
test('issued session validates and expires',async()=>{
  const now=Date.now(),token=await createSession(secret,now);
  assert.equal(await verifySession(token,secret,now),true);
  assert.equal(await verifySession(token+'x',secret,now),false);
  assert.equal(await verifySession(token,secret,now+16*86400000),false);
});
test('credential equality compares fixed-size hashes',async()=>{
  assert.equal(await constantTimeEqual('green','green'),true);
  assert.equal(await constantTimeEqual('green','greener'),false);
});
