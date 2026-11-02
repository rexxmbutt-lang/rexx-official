// Vercel serverless function: GET /api/bypass?url=<link>
// Env (Vercel > Settings > Environment Variables):
//   BYPASS_UPSTREAM          wajib untuk provider yang tidak menyimpan tujuan di dalam link.
//                            Contoh: https://api-kamu.example/bypass?url={url}   ({url} otomatis di-encode)
//   BYPASS_UPSTREAM_KEY      opsional, API key upstream
//   BYPASS_UPSTREAM_KEY_HEADER opsional, nama header key (default: Authorization -> "Bearer <key>")

const ALLOW = [
  'lootlabs.gg', 'loot-link.com', 'loot-links.com', 'lootdest.org', 'lootdest.info', 'lootdest.com',
  'platoboost.com', 'platoboost.net', 'platoboost.app',
  'linkvertise.com', 'link-center.net', 'link-target.net', 'link-hub.net', 'direct-link.net',
  'work.ink', 'boost.ink', 'sub2unlock.com', 'sub2unlock.net', 'sub2unlock.io',
  'lockr.so', 'rekonise.com',
];
const EMBED_KEYS = ['r', 'url', 'u', 'target', 'dest', 'destination', 'link'];
const RESULT_KEYS = ['result', 'destination', 'bypassed', 'key', 'url', 'data', 'link', 'target'];

const hits = new Map(); // rate limit sederhana per instance (best effort)
function limited(ip) {
  const now = Date.now(), w = 60000, max = 20;
  const a = (hits.get(ip) || []).filter(t => now - t < w);
  a.push(now); hits.set(ip, a);
  if (hits.size > 5000) hits.clear();
  return a.length > max;
}

const inAllow = h => ALLOW.some(d => h === d || h.endsWith('.' + d));
const isHttp = s => { try { const u = new URL(s); return /^https?:$/.test(u.protocol); } catch { return false; } };

function decodeEmbedded(u) {
  for (const k of EMBED_KEYS) {
    const v = u.searchParams.get(k);
    if (!v) continue;
    const cands = [v];
    try { cands.push(Buffer.from(v.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch {}
    for (const c of cands) {
      const t = (c || '').trim();
      if (/^https?:\/\/\S+$/.test(t) && isHttp(t) && !inAllow(new URL(t).hostname.toLowerCase())) return t;
    }
  }
  return null;
}

function pick(o, depth = 0) {
  if (o == null || depth > 3) return null;
  if (typeof o === 'string') return o.trim() || null;
  if (typeof o !== 'object') return null;
  for (const k of RESULT_KEYS) {
    if (k in o) { const r = pick(o[k], depth + 1); if (r) return r; }
  }
  return null;
}

async function viaUpstream(target) {
  const tpl = process.env.BYPASS_UPSTREAM;
  if (!tpl) { const e = new Error('BYPASS_UPSTREAM belum diset di Environment Variables Vercel'); e.status = 501; throw e; }
  const endpoint = tpl.includes('{url}')
    ? tpl.replace('{url}', encodeURIComponent(target))
    : tpl + (tpl.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(target);
  const headers = { Accept: 'application/json', 'User-Agent': 'rexx-bypass/1.0' };
  const key = process.env.BYPASS_UPSTREAM_KEY;
  if (key) {
    const hn = process.env.BYPASS_UPSTREAM_KEY_HEADER;
    if (hn) headers[hn] = key; else headers.Authorization = 'Bearer ' + key;
  }
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 22000);
  try {
    const r = await fetch(endpoint, { headers, signal: ctrl.signal });
    const txt = await r.text();
    let out = null, msg = null;
    try { const j = JSON.parse(txt); out = pick(j); msg = j && (j.error || j.message); }
    catch { if (txt.length < 2000) out = txt.trim(); }
    if (!r.ok || !out) { const e = new Error(msg || `upstream gagal (HTTP ${r.status})`); e.status = 502; throw e; }
    return out.slice(0, 4000);
  } catch (e) {
    if (e.name === 'AbortError') { const x = new Error('upstream timeout'); x.status = 504; throw x; }
    throw e;
  } finally { clearTimeout(to); }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const send = (code, body) => res.status(code).send(JSON.stringify(body));
  try {
    if (req.method !== 'GET') return send(405, { ok: false, error: 'Method not allowed' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
    if (limited(ip)) return send(429, { ok: false, error: 'Terlalu banyak request, coba lagi sebentar' });

    const raw = String((req.query && req.query.url) || '').trim();
    if (!raw || raw.length > 2048) return send(400, { ok: false, error: 'Parameter url kosong atau terlalu panjang' });
    let u;
    try { u = new URL(raw); } catch { return send(400, { ok: false, error: 'Link tidak valid' }); }
    if (!/^https?:$/.test(u.protocol) || u.username || u.password) return send(400, { ok: false, error: 'Link tidak valid' });
    const host = u.hostname.toLowerCase();
    if (!inAllow(host)) return send(400, { ok: false, error: 'Provider tidak didukung: ' + host });

    const direct = decodeEmbedded(u);
    if (direct) return send(200, { ok: true, result: direct, method: 'decode', provider: host });

    const result = await viaUpstream(u.toString());
    return send(200, { ok: true, result, method: 'upstream', provider: host });
  } catch (e) {
    return send(e.status || 500, { ok: false, error: e.message || 'Server error' });
  }
};
