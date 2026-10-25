// Shadow Rep — one sign-in for the gym app and the food app.
//
// The food app (NutriTrace) keeps people signed in with a cookie `nt_token`: a standard HS256-signed token
// {id, username, role, csrf}. It only checks the signature against its own JWT_SECRET. This module lets a person who is
// ALREADY signed in here (passkey) and is on the allow-list receive that cookie for the food account, so opening the Food
// tab never shows a second login. Nothing in NutriTrace is modified.
//
// Safe by construction:
//  * needs a valid Shadow Rep session, and the profile must be on the allow-list (FOOD_SSO_UIDS, default ADMIN_UIDS) —
//    anyone else just lands on the food app's normal login;
//  * unconfigured (no NUTRITRACE_JWT_SECRET / FOOD_SSO_USER_ID / FOOD_SSO_USERNAME) = does nothing;
//  * the redirect target can only be a /food/ path (no open redirect);
//  * a still-valid existing food cookie is reused, so open tabs keep working (a new cookie would rotate the CSRF value).
//
// Env: NUTRITRACE_JWT_SECRET, FOOD_SSO_USER_ID, FOOD_SSO_USERNAME, FOOD_SSO_ROLE (default admin), FOOD_SSO_UIDS, FOOD_SSO_HOURS (default 8760), ORIGIN.
import crypto from 'node:crypto';

const b64u = v => Buffer.from(v).toString('base64url');

/** Compact HS256 token, byte-compatible with the `jsonwebtoken` library NutriTrace verifies with. */
export function signHS256(payload, secret) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(head + '.' + body).digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Payload if the signature holds and it has not expired; otherwise null. */
export function verifyHS256(token, secret, nowMs = Date.now()) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const want = crypto.createHmac('sha256', secret).update(parts[0] + '.' + parts[1]).digest();
  let got; try { got = Buffer.from(parts[2], 'base64url'); } catch { return null; }
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null;
  try {
    if (JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')).alg !== 'HS256') return null;
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof p.exp === 'number' && p.exp * 1000 <= nowMs) return null;
    return p;
  } catch { return null; }
}

export function cookieValue(header, name) {
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

/** Only ever send people to a path inside the food app. */
export function safeNext(n) {
  return typeof n === 'string' && n.startsWith('/food/') && !/[\\\r\n]/.test(n) && n.length < 500 ? n : '/food/';
}

export function createFoodSso({ readSession, env = process.env, now = Date.now, rand = () => crypto.randomBytes(16).toString('hex') }) {
  const secret = String(env.NUTRITRACE_JWT_SECRET || '');
  const uidRaw = String(env.FOOD_SSO_USER_ID || '').trim();
  const username = String(env.FOOD_SSO_USERNAME || '').trim();
  const role = String(env.FOOD_SSO_ROLE || 'admin').trim();
  const hours = Math.max(1, Number(env.FOOD_SSO_HOURS) || 8760);
  const allow = String(env.FOOD_SSO_UIDS || env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const secure = /^https:/i.test(String(env.ORIGIN || '')) ? '; Secure' : '';
  const ready = !!(secret && uidRaw && username && allow.length);
  const userId = /^\d+$/.test(uidRaw) ? Number(uidRaw) : uidRaw;   // NutriTrace ids are integers
  const REUSE_IF_MORE_THAN_MS = 30 * 86400000;

  const cookieFor = token => `nt_token=${token}; Path=/; Max-Age=${hours * 3600}; HttpOnly; SameSite=Lax${secure}`;
  // sent on Shadow Rep sign-out so one sign-out ends both (only when the bridge is on)
  const clearCookie = ready ? `nt_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}` : null;

  const routes = {
    'GET /api/food/enter': async (req, res) => {
      const next = safeNext(new URL(req.url, 'http://x').searchParams.get('next'));
      const go = cookie => {
        res.writeHead(302, { Location: next, 'Cache-Control': 'no-store', ...(cookie ? { 'Set-Cookie': cookie } : {}) });
        res.end();
      };
      const user = ready ? readSession(req) : null;
      if (!user || !allow.includes(user.id)) return go();

      const t = now();
      const have = verifyHS256(cookieValue(req.headers.cookie, 'nt_token'), secret, t);
      if (have && have.id === userId && have.username === username && have.exp * 1000 - t > REUSE_IF_MORE_THAN_MS) return go();

      const iat = Math.floor(t / 1000);
      return go(cookieFor(signHS256({ id: userId, username, role, csrf: rand(), iat, exp: iat + hours * 3600 }, secret)));
    }
  };
  return { ready, routes, clearCookie };
}
