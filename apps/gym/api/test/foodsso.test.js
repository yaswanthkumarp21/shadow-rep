import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { signHS256, verifyHS256, cookieValue, safeNext, createFoodSso } from '../custom/foodsso.js';

const SECRET = 'a-long-test-secret-for-the-food-app';
const ENV = { NUTRITRACE_JWT_SECRET: SECRET, FOOD_SSO_USER_ID: '2', FOOD_SSO_USERNAME: 'yash', ADMIN_UIDS: 'adminUid', ORIGIN: 'https://example.ts.net' };
const NOW = 1_800_000_000_000;

function call(sso, { user, cookie = '', url = '/api/food/enter' } = {}) {
  const out = {};
  const res = { writeHead(code, h) { out.code = code; out.headers = h; }, end() { out.ended = true; } };
  return sso.routes['GET /api/food/enter']({ url, headers: { cookie } }, res).then(() => out);
}
const make = (env = ENV, user = { id: 'adminUid' }, extra = {}) => createFoodSso({ readSession: () => user, env, now: () => NOW, rand: () => 'f'.repeat(32), ...extra });
const tokenOf = setCookie => setCookie.split(';')[0].replace('nt_token=', '');

test('tokens are standard HS256 JWTs that verify, and tampering fails', () => {
  const t = signHS256({ id: 2, username: 'yash', exp: Math.floor(NOW / 1000) + 100 }, SECRET);
  assert.equal(t.split('.').length, 3);
  // independent re-computation of the signature, the way any JWT library would
  const [h, p, s] = t.split('.');
  assert.equal(s, crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url'));
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'HS256', typ: 'JWT' });
  assert.equal(verifyHS256(t, SECRET, NOW).username, 'yash');
  assert.equal(verifyHS256(t, 'wrong-secret', NOW), null);
  assert.equal(verifyHS256(h + '.' + Buffer.from('{"id":99}').toString('base64url') + '.' + s, SECRET, NOW), null);
  assert.equal(verifyHS256(t, SECRET, NOW + 200_000), null, 'expired');
  assert.equal(verifyHS256('nonsense', SECRET), null);
  assert.equal(verifyHS256(undefined, SECRET), null);
});

test('alg:none and other algorithms are refused', () => {
  const none = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"id":2}').toString('base64url') + '.';
  assert.equal(verifyHS256(none, SECRET), null);
});

test('cookie parsing and redirect-target safety', () => {
  assert.equal(cookieValue('a=1; nt_token=abc.def; b=2', 'nt_token'), 'abc.def');
  assert.equal(cookieValue('a=1', 'nt_token'), null);
  assert.equal(safeNext('/food/'), '/food/');
  assert.equal(safeNext('/food/#/foods'), '/food/#/foods');
  for (const bad of ['//evil.com', 'https://evil.com', '/api/logout', '/food', '/foodx/', '/food/\r\nSet-Cookie: x=1', '/food/\\evil', undefined, 42]) assert.equal(safeNext(bad), '/food/', String(bad));
});

test('a signed-in allow-listed profile gets the food cookie and is sent to /food/', async () => {
  const r = await call(make());
  assert.equal(r.code, 302);
  assert.equal(r.headers.Location, '/food/');
  const sc = r.headers['Set-Cookie'];
  assert.match(sc, /^nt_token=/);
  assert.match(sc, /; Path=\/;/); assert.match(sc, /; HttpOnly/); assert.match(sc, /; SameSite=Lax/); assert.match(sc, /; Secure$/);
  assert.match(sc, /Max-Age=31536000/);
  const p = verifyHS256(tokenOf(sc), SECRET, NOW);
  assert.deepEqual({ id: p.id, username: p.username, role: p.role, csrf: p.csrf }, { id: 2, username: 'yash', role: 'admin', csrf: 'f'.repeat(32) });
  assert.equal(p.exp - p.iat, 8760 * 3600);
});

test('no cookie over plain http (so local testing works)', async () => {
  const r = await call(make({ ...ENV, ORIGIN: 'http://localhost:8080' }));
  assert.doesNotMatch(r.headers['Set-Cookie'], /Secure/);
});

test('nobody else gets one: signed-out, other profiles, or an unconfigured bridge', async () => {
  assert.equal((await call(make(ENV, null))).headers['Set-Cookie'], undefined, 'signed out');
  assert.equal((await call(make(ENV, { id: 'someoneElse' }))).headers['Set-Cookie'], undefined, 'not on the allow-list');
  for (const k of ['NUTRITRACE_JWT_SECRET', 'FOOD_SSO_USER_ID', 'FOOD_SSO_USERNAME']) {
    const e = { ...ENV }; delete e[k];
    const sso = make(e);
    assert.equal(sso.ready, false); assert.equal(sso.clearCookie, null);
    const r = await call(sso); assert.equal(r.code, 302); assert.equal(r.headers['Set-Cookie'], undefined, k + ' missing');
  }
  const noList = { ...ENV }; delete noList.ADMIN_UIDS;
  assert.equal(make(noList).ready, false, 'empty allow-list = off, never "everyone"');
});

test('FOOD_SSO_UIDS overrides ADMIN_UIDS', async () => {
  const env = { ...ENV, FOOD_SSO_UIDS: 'a, b' };
  assert.ok((await call(make(env, { id: 'b' }))).headers['Set-Cookie']);
  assert.equal((await call(make(env, { id: 'adminUid' }))).headers['Set-Cookie'], undefined);
});

test('a healthy existing food cookie is reused (open tabs keep their CSRF value); a stale or foreign one is replaced', async () => {
  const fresh = signHS256({ id: 2, username: 'yash', role: 'admin', csrf: 'x', exp: Math.floor(NOW / 1000) + 200 * 86400 }, SECRET);
  assert.equal((await call(make(), { cookie: `nt_token=${fresh}` })).headers['Set-Cookie'], undefined, 'reused');
  const nearEnd = signHS256({ id: 2, username: 'yash', role: 'admin', csrf: 'x', exp: Math.floor(NOW / 1000) + 5 * 86400 }, SECRET);
  assert.ok((await call(make(), { cookie: `nt_token=${nearEnd}` })).headers['Set-Cookie'], 'close to expiry: renewed');
  const otherUser = signHS256({ id: 7, username: 'someone', role: 'user', csrf: 'x', exp: Math.floor(NOW / 1000) + 200 * 86400 }, SECRET);
  assert.ok((await call(make(), { cookie: `nt_token=${otherUser}` })).headers['Set-Cookie'], 'a different food account is replaced');
  const forged = signHS256({ id: 2, username: 'yash', role: 'admin', csrf: 'x', exp: Math.floor(NOW / 1000) + 200 * 86400 }, 'attacker-secret');
  assert.ok((await call(make(), { cookie: `nt_token=${forged}` })).headers['Set-Cookie'], 'bad signature: replaced');
});

test('the ?next target is honoured only inside /food/', async () => {
  assert.equal((await call(make(), { url: '/api/food/enter?next=/food/%23/foods' })).headers.Location, '/food/#/foods');
  assert.equal((await call(make(), { url: '/api/food/enter?next=//evil.com' })).headers.Location, '/food/');
  assert.equal((await call(make(), { url: '/api/food/enter?next=https://evil.com/food/' })).headers.Location, '/food/');
});

test('sign-out clears the food cookie too, only when the bridge is on', () => {
  assert.match(make().clearCookie, /^nt_token=; Path=\/; Max-Age=0;/);
  assert.equal(make({}).clearCookie, null);
});
