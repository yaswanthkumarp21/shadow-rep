// Shadow Rep — read-only "Today's nutrition" link to a self-hosted NutriTrace.
//
// Added on top of Shadow Rep (not part of upstream). The browser never sees the NutriTrace token:
// it asks GET /api/nutrition/today?date=YYYY-MM-DD here, and this module calls NutriTrace's
// documented MCP endpoint (POST <NUTRITRACE_URL>/api/mcp, tools get_daily_totals + get_goals)
// with a read-only `mcp:read` bearer token. Results are cached briefly and every failure
// degrades to { ok:false } so the Home screen keeps working with NutriTrace off.
//
// Env: NUTRITRACE_URL (e.g. http://host.docker.internal:3001/food), NUTRITRACE_TOKEN (nt_pat_…).
// Neither set → the route answers { ok:false, reason:'not_configured' } and the card hides itself.

const TTL_MS = 45_000;          // fresh window: repeat Home visits don't hammer NutriTrace
const STALE_MS = 10 * 60_000;   // if NutriTrace is down, keep showing the last good numbers this long
const TIMEOUT_MS = 4_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** MCP replies as `event: message\ndata: {json}` (SSE) or as plain JSON — accept both. */
export function parseMcpBody(text) {
  const t = String(text || '').trim();
  if (!t) throw new Error('empty MCP reply');
  if (t.startsWith('{')) return JSON.parse(t);
  const datas = t.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).filter(Boolean);
  if (!datas.length) throw new Error('no data in MCP reply');
  return JSON.parse(datas[datas.length - 1]);
}

/** Unwrap a tools/call reply into the tool's own JSON object. */
export function toolResult(msg) {
  if (msg.error) throw new Error('MCP error: ' + (msg.error.message || msg.error.code));
  const r = msg.result;
  if (!r) throw new Error('MCP reply has no result');
  if (r.isError) throw new Error('MCP tool error');
  if (r.structuredContent && typeof r.structuredContent === 'object') return r.structuredContent;
  const text = r.content?.find(c => c.type === 'text')?.text;
  return text ? JSON.parse(text) : {};
}

const num = v => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(+v)) return +v;
  // Some APIs wrap a number: { value: 120 } / { target: 150 } / { amount: .. } / { total: .. }
  if (v && typeof v === 'object') for (const k of ['value', 'target', 'amount', 'total', 'max', 'goal']) if (k in v) { const n = num(v[k]); if (n != null) return n; }
  return null;
};

/** First numeric value among several candidate key names (NutriTrace key names are matched loosely). */
export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return null;
  const norm = s => s.toLowerCase().replace(/[^a-z]/g, '');
  const byNorm = new Map(Object.keys(obj).map(k => [norm(k), k]));
  for (const k of keys) { const real = byNorm.get(norm(k)); if (real !== undefined) { const n = num(obj[real]); if (n != null) return n; } }
  return null;
}

const KEYS = {
  calories: ['calories', 'kcal', 'energy_kcal', 'energy', 'cal'],
  protein: ['protein', 'protein_g', 'proteins'],
  carbs: ['carbs', 'carbs_g', 'carbohydrates', 'carbohydrate', 'carbohydrates_g'],
  fat: ['fat', 'fat_g', 'fats', 'total_fat']
};
const round = n => (n == null ? null : Math.round(n * 10) / 10);

/** Turn raw get_daily_totals + get_goals output into the small shape the Home card needs. */
export function shapeNutrition(date, totalsRes, goalsRes) {
  const totals = totalsRes?.totals || {};
  const goals = goalsRes?.goals || {};
  const out = { ok: true, date, items: totalsRes?.item_count ?? 0, water: { ml: totalsRes?.water_ml ?? 0, target: num(goalsRes?.water_goal_ml) } };
  for (const m of Object.keys(KEYS)) {
    out[m] = { eaten: round(pick(totals, KEYS[m]) ?? 0), target: round(pick(goals, KEYS[m])) };
  }
  return out;
}

/** Turn get_daily_totals_range + get_goals into per-day rows (only days with something logged) and the targets the game layer needs. */
export function shapeRange(rangeRes, goalsRes) {
  const goals = goalsRes?.goals || {};
  const days = (Array.isArray(rangeRes?.totals) ? rangeRes.totals : []).map(d => ({
    date: d.date,
    calories: round(pick(d.totals, KEYS.calories) ?? 0),
    proteins: round(pick(d.totals, KEYS.protein) ?? 0),
    carbs: round(pick(d.totals, KEYS.carbs) ?? 0),
    fat: round(pick(d.totals, KEYS.fat) ?? 0),
    water_ml: d.water_ml ?? 0,
    items: d.item_count ?? 0
  })).filter(d => DATE_RE.test(d.date || ''));
  return {
    ok: true, days,
    goals: { calories: round(pick(goals, KEYS.calories)), protein: round(pick(goals, KEYS.protein)), water: num(goalsRes?.water_goal_ml) }
  };
}

export function nutritionRoutes({ json, readSession, env = process.env, fetchImpl = globalThis.fetch, now = Date.now }) {
  const base = String(env.NUTRITRACE_URL || '').replace(/\/+$/, '');
  const token = String(env.NUTRITRACE_TOKEN || '').trim();
  const cache = new Map(); // date -> { at, data }

  async function callTool(name, args) {
    const res = await fetchImpl(base + '/api/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!res.ok) throw new Error(`NutriTrace ${name}: HTTP ${res.status}`);
    return toolResult(parseMcpBody(await res.text()));
  }

  const rangeCache = new Map(); // "start|end" -> { at, data }
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

  return {
    // Last N days of nutrition (default 60, max 90) for the Level-Up stats: which days had food logged,
    // hit the protein target or the water goal. Same softness rules as /today.
    'GET /api/nutrition/range': async (req, res) => {
      if (!readSession(req)) return json(res, 401, { error: 'not signed in' });
      if (!base || !token) return json(res, 200, { ok: false, reason: 'not_configured' });

      const q = new URL(req.url, 'http://x').searchParams;
      const end = DATE_RE.test(q.get('end') || '') ? q.get('end') : new Date(now()).toISOString().slice(0, 10);
      const n = Math.min(90, Math.max(1, parseInt(q.get('days'), 10) || 60));
      const start = addDays(end, -(n - 1));
      const key = start + '|' + end;

      const hit = rangeCache.get(key);
      if (hit && now() - hit.at < TTL_MS) return json(res, 200, hit.data);
      try {
        const [range, goals] = await Promise.all([callTool('get_daily_totals_range', { start, end }), callTool('get_goals', {})]);
        const data = shapeRange(range, goals);
        rangeCache.set(key, { at: now(), data });
        if (rangeCache.size > 6) rangeCache.delete(rangeCache.keys().next().value);
        return json(res, 200, data);
      } catch (e) {
        console.error('nutrition range:', e.message);
        if (hit && now() - hit.at < STALE_MS) return json(res, 200, { ...hit.data, stale: true });
        return json(res, 200, { ok: false, reason: 'unavailable' });
      }
    },

    'GET /api/nutrition/today': async (req, res) => {
      if (!readSession(req)) return json(res, 401, { error: 'not signed in' });
      if (!base || !token) return json(res, 200, { ok: false, reason: 'not_configured' });

      const asked = new URL(req.url, 'http://x').searchParams.get('date');
      const date = DATE_RE.test(asked || '') ? asked : new Date(now()).toISOString().slice(0, 10);

      const hit = cache.get(date);
      if (hit && now() - hit.at < TTL_MS) return json(res, 200, hit.data);

      try {
        const [totals, goals] = await Promise.all([callTool('get_daily_totals', { date }), callTool('get_goals', {})]);
        const data = shapeNutrition(date, totals, goals);
        cache.set(date, { at: now(), data });
        if (cache.size > 14) cache.delete(cache.keys().next().value);
        return json(res, 200, data);
      } catch (e) {
        console.error('nutrition:', e.message);   // message only — never the token or the response body
        if (hit && now() - hit.at < STALE_MS) return json(res, 200, { ...hit.data, stale: true });
        return json(res, 200, { ok: false, reason: 'unavailable' });
      }
    }
  };
}
