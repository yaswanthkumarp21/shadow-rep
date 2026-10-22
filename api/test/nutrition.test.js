import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMcpBody, toolResult, pick, shapeNutrition, nutritionRoutes } from '../custom/nutrition.js';

const sse = obj => `event: message\ndata: ${JSON.stringify(obj)}\n\n`;
const reply = structured => sse({ result: { content: [{ type: 'text', text: JSON.stringify(structured) }], structuredContent: structured }, jsonrpc: '2.0', id: 1 });

test('MCP replies parse as SSE or plain JSON', () => {
  assert.deepEqual(parseMcpBody('{"a":1}'), { a: 1 });
  assert.deepEqual(parseMcpBody('event: message\ndata: {"a":2}\n\n'), { a: 2 });
  assert.throws(() => parseMcpBody(''));
  assert.throws(() => parseMcpBody('event: ping\n\n'));
});

test('toolResult prefers structuredContent, falls back to the text block, surfaces errors', () => {
  assert.deepEqual(toolResult({ result: { structuredContent: { x: 1 }, content: [] } }), { x: 1 });
  assert.deepEqual(toolResult({ result: { content: [{ type: 'text', text: '{"y":2}' }] } }), { y: 2 });
  assert.throws(() => toolResult({ error: { message: 'nope' } }), /nope/);
  assert.throws(() => toolResult({ result: { isError: true, content: [] } }));
});

test('pick matches key names loosely and unwraps {value}/{target}', () => {
  assert.equal(pick({ Protein_g: 40 }, ['protein', 'protein_g']), 40);
  assert.equal(pick({ 'carbs-g': '12.5' }, ['carbs_g']), 12.5);
  assert.equal(pick({ calories: { target: 2200 } }, ['calories']), 2200);
  assert.equal(pick({}, ['calories']), null);
  assert.equal(pick(null, ['calories']), null);
});

test('shapeNutrition: empty day is zeros with null targets; goals fill targets', () => {
  const empty = shapeNutrition('2026-10-22', { totals: {}, water_ml: 0, item_count: 0 }, { goals: {}, water_goal_ml: null });
  assert.equal(empty.ok, true);
  assert.deepEqual(empty.calories, { eaten: 0, target: null });
  const full = shapeNutrition('2026-10-22',
    { totals: { calories: 1234.56, protein: 80, carbs: 150, fat: 40 }, water_ml: 500, item_count: 4 },
    { goals: { calories: 2200, protein: 140, carbs: 250, fat: 70 }, water_goal_ml: 3000 });
  assert.deepEqual(full.calories, { eaten: 1234.6, target: 2200 });
  assert.deepEqual(full.protein, { eaten: 80, target: 140 });
  assert.deepEqual(full.water, { ml: 500, target: 3000 });
  assert.equal(full.items, 4);
});

test('shapeNutrition understands NutriTrace\'s real get_goals format (proteins/carbohydrates/fat with max)', () => {
  // captured from a live NutriTrace v1.4.0 instance
  const goal = max => ({ sharedGoal: true, isMin: false, isPercent: false, autoAdjust: false, showInDiary: true, showInStats: true, days: Array(7).fill(max), max });
  const real = { goals: { proteins: goal(150), fat: goal(100), carbohydrates: goal(100) }, water_goal_ml: 8000 };
  const s = shapeNutrition('2026-10-22', { totals: { calories: 300, proteins: 12, carbohydrates: 40, fat: 9 }, water_ml: 0, item_count: 1 }, real);
  assert.deepEqual(s.protein, { eaten: 12, target: 150 });
  assert.deepEqual(s.carbs, { eaten: 40, target: 100 });
  assert.deepEqual(s.fat, { eaten: 9, target: 100 });
  assert.deepEqual(s.calories, { eaten: 300, target: null }, 'no calorie goal set → target stays null, card shows no bar');
  assert.equal(s.water.target, 8000);
});

/* ---- the route ---- */
function harness(env, fetchImpl, now = () => 1_000_000) {
  const out = {};
  const json = (res, code, body) => { out.code = code; out.body = body; };
  const routes = nutritionRoutes({ json, readSession: req => req.user, env, fetchImpl, now });
  const call = async (req) => { await routes['GET /api/nutrition/today'](req, {}); return out; };
  return { call, out };
}
const ENV = { NUTRITRACE_URL: 'http://nt/food/', NUTRITRACE_TOKEN: 'nt_pat_secret' };
const good = async (url, init) => {
  const name = JSON.parse(init.body).params.name;
  const body = name === 'get_goals' ? { goals: { calories: 2000, protein: 150 }, water_goal_ml: 2500 } : { date: '2026-10-22', totals: { calories: 500, protein: 30 }, water_ml: 250, item_count: 2 };
  return { ok: true, status: 200, text: async () => reply(body) };
};

test('route: needs a signed-in user', async () => {
  const h = harness(ENV, good);
  const r = await h.call({ url: '/api/nutrition/today' });
  assert.equal(r.code, 401);
});

test('route: not configured → soft answer, never touches the network', async () => {
  let hit = false;
  const h = harness({}, async () => { hit = true; });
  const r = await h.call({ url: '/api/nutrition/today', user: { id: 'u' } });
  assert.deepEqual(r.body, { ok: false, reason: 'not_configured' });
  assert.equal(hit, false);
});

test('route: happy path sends the bearer token server-side and returns the small shape', async () => {
  let seen;
  const h = harness(ENV, async (url, init) => { seen = { url, auth: init.headers.Authorization }; return good(url, init); });
  const r = await h.call({ url: '/api/nutrition/today?date=2026-10-22', user: { id: 'u' } });
  assert.equal(r.code, 200);
  assert.equal(seen.url, 'http://nt/food/api/mcp');
  assert.equal(seen.auth, 'Bearer nt_pat_secret');
  assert.equal(r.body.calories.eaten, 500);
  assert.equal(r.body.calories.target, 2000);
  assert.ok(!JSON.stringify(r.body).includes('nt_pat_'), 'token must never reach the browser');
});

test('route: caches for the fresh window, refetches after it', async () => {
  let n = 0, t = 1_000_000;
  const h = harness(ENV, async (u, i) => { n++; return good(u, i); }, () => t);
  const req = { url: '/api/nutrition/today?date=2026-10-22', user: { id: 'u' } };
  await h.call(req); await h.call(req);
  assert.equal(n, 2, 'two tool calls for the first request, none for the second');
  t += 46_000; await h.call(req);
  assert.equal(n, 4);
});

test('route: NutriTrace down → soft failure; recent good data is served as stale', async () => {
  let t = 1_000_000, down = false;
  const h = harness(ENV, async (u, i) => { if (down) throw new Error('ECONNREFUSED'); return good(u, i); }, () => t);
  const req = { url: '/api/nutrition/today?date=2026-10-22', user: { id: 'u' } };
  down = true;
  assert.deepEqual((await h.call(req)).body, { ok: false, reason: 'unavailable' });
  down = false; await h.call(req);
  down = true; t += 60_000;
  const r = await h.call(req);
  assert.equal(r.body.ok, true); assert.equal(r.body.stale, true);
  t += 11 * 60_000;
  assert.equal((await h.call(req)).body.ok, false);
});

test('route: HTTP errors (bad token) degrade softly', async () => {
  const h = harness(ENV, async () => ({ ok: false, status: 401, text: async () => '' }));
  assert.deepEqual((await h.call({ url: '/api/nutrition/today', user: { id: 'u' } })).body, { ok: false, reason: 'unavailable' });
});

test('route: a malformed date falls back to today instead of being forwarded', async () => {
  let sent;
  const h = harness(ENV, async (u, i) => { const b = JSON.parse(i.body); if (b.params.name === 'get_daily_totals') sent = b.params.arguments.date; return good(u, i); });
  await h.call({ url: '/api/nutrition/today?date=../../etc', user: { id: 'u' } });
  assert.match(sent, /^\d{4}-\d{2}-\d{2}$/);
});
