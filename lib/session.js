export const COOKIE = 'hel_session';
export const SESSION_AGE = 14 * 86400;
const encoder = new TextEncoder();

function b64(data) {
  let raw = '';
  for (const byte of new Uint8Array(data)) raw += String.fromCharCode(byte);
  return btoa(raw).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function unb64(value) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(value)) return null;
  try {
    const chars = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '=');
    return Uint8Array.from(chars, c => c.charCodeAt(0));
  } catch { return null; }
}
async function key(secret) {
  if (!secret || secret.length < 32) throw Error('SESSION_SECRET must be at least 32 characters');
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign','verify']);
}
export async function createSession(secret, now = Date.now()) {
  const body = 'v1.' + (Math.floor(now/1000) + SESSION_AGE);
  const sig = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(body));
  return body + '.' + b64(sig);
}
export async function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !secret || secret.length < 32) return false;
  const m = /^v1\.(\d{10})\.([a-zA-Z0-9_-]{43})$/.exec(token);
  if (!m || Number(m[1]) <= Math.floor(now/1000)) return false;
  const bytes = unb64(m[2]);
  if (!bytes || bytes.length !== 32 || b64(bytes) !== m[2]) return false;
  try { return await crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode('v1.'+m[1])); }
  catch { return false; }
}
export async function constantTimeEqual(a,b) {
  const [left,right] = await Promise.all([crypto.subtle.digest('SHA-256',encoder.encode(String(a))),crypto.subtle.digest('SHA-256',encoder.encode(String(b)))]);
  const x=new Uint8Array(left), y=new Uint8Array(right);
  let mismatch=0;
  for (let i=0; i<x.length; i++) mismatch |= x[i]^y[i];
  return mismatch===0;
}
