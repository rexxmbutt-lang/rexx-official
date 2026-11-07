// api/bypass.js — VERSI FIX REXX (udah dibenerin dari kode Grok)
// Support: linkvertise, work.ink, sub2unlock, sfl.gl, boost.ink,
//          platoboost, lootlabs, LockR, rekonise, adsmore, luarmor

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function safeFetch(url, opts = {}, timeoutMs = 10000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    ...opts,
    redirect: opts.redirect || 'manual',
    signal: ctrl.signal,
    headers: {
      'User-Agent': UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(opts.headers || {}),
    },
  }).finally(() => clearTimeout(timer));
}

async function safeJson(res) {
  try {
    const text = await res.text();
    if (!text || text.trim().startsWith('<')) return null;
    return JSON.parse(text);
  } catch { return null; }
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

function pickResult(obj, depth = 0) {
  if (!obj || depth > 4) return null;
  if (typeof obj === 'string') {
    const s = obj.trim();
    return /^https?:\/\//i.test(s) ? s : null;
  }
  if (typeof obj !== 'object') return null;
  const keys = ['result', 'destination', 'url', 'link', 'target', 'redirect', 'bypassed', 'data', 'final', 'direct'];
  for (const k of keys) {
    if (k in obj) {
      const found = pickResult(obj[k], depth + 1);
      if (found) return found;
    }
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'object') {
      const found = pickResult(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function withRetry(fn, max = 2) {
  let lastErr;
  for (let i = 0; i <= max; i++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      if (i < max) await new Promise(r => setTimeout(r, 400 + i * 300));
    }
  }
  throw lastErr;
}

// API CADANGAN - YANG BENERAN ADA, BUKAN NGARANG
const BACKUP_APIS = [
  (u) => `https://api.bypass.vip/bypass?url=${encodeURIComponent(u)}`,
  (u) => `https://api.bypass.vip/api/bypass?url=${encodeURIComponent(u)}`,
];

async function tryBackupApis(target) {
  for (let i = 0; i < BACKUP_APIS.length; i++) {
    try {
      const res = await withRetry(() =>
        safeFetch(BACKUP_APIS[i](target), { headers: { Accept: 'application/json' } }, 10000)
      );
      if (!res || !res.ok) continue;
      const json = await safeJson(res);
      const out = pickResult(json);
      if (out) return out;
    } catch {}
  }
  return null;
}

async function followRedirects(url, maxHops = 6) {
  let current = url;
  for (let i = 0; i < maxHops; i++) {
    let res;
    try { res = await safeFetch(current, { method: 'GET', redirect: 'manual' }, 9000); } catch { return null; }
    const loc = res.headers.get('location');
    if (!loc) {
      if (res.status >= 200 && res.status < 400 && i > 0) return current;
      return null;
    }
    try { current = new URL(loc, current).toString(); } catch { return null; }
  }
  return current;
}

function extractFromHtml(html, baseUrl) {
  if (!html) return null;
  const meta = html.match(/http-equiv=["']?refresh["'][^>]*content=["']?\d+;\s*url=([^"'\s>]+)/i);
  if (meta) { try { return new URL(meta[1], baseUrl).toString(); } catch {} }
  const locPatterns = [
    /(?:window\.)?location(?:\.href)?\s*=\s*["'](https?:\/\/[^"']+)["']/i,
    /(?:window\.)?location\.replace\(["'](https?:\/\/[^"']+)["']/i,
    /(?:window\.)?location\.assign\(["'](https?:\/\/[^"']+)["']/i,
  ];
  for (const re of locPatterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  const dataUrl = html.match(/data-(?:url|href|target|link|redirect)=["'](https?:\/\/[^"']+)["']/i);
  if (dataUrl) return dataUrl[1];
  const loot = html.match(/https:\/\/lootdest\.org\/s\?[^"'\s<>]+/i);
  if (loot) return loot[0];
  return null;
}

async function directBypass(target) {
  const redirected = await followRedirects(target);
  if (redirected && redirected !== target) return redirected;
  try {
    const res = await safeFetch(target, { method: 'GET', redirect: 'follow' }, 10000);
    const html = await safeText(res);
    const found = extractFromHtml(html, target);
    if (found) return found;
  } catch {}
  return null;
}

async function handleKeySystem(name) {
  return {
    success: false,
    isKeySystem: true,
    message: `KEY SYSTEM DETECTED (${name}) — Butuh bypass manual / key generator`,
    provider: name.toLowerCase(),
  };
}

async function handleWithDirectThenBackup(target, label) {
  const direct = await directBypass(target);
  if (direct) return direct;
  const viaApi = await tryBackupApis(target);
  if (viaApi) return viaApi;
  throw new Error(`${label} gagal: direct & semua backup API tidak merespons`);
}

async function handleMultiApiOnly(target, label) {
  const viaApi = await tryBackupApis(target);
  if (viaApi) return viaApi;
  const direct = await directBypass(target);
  if (direct) return direct;
  throw new Error(`${label} gagal: semua server API sedang sibuk / mati`);
}

const PROVIDERS = [
  { name: 'linkvertise', hosts: ['linkvertise.com', 'link-to.net', 'linkvertise.net'], run: (t) => handleMultiApiOnly(t, 'Linkvertise') },
  { name: 'work.ink', hosts: ['work.ink', 'workink.net'], run: (t) => handleWithDirectThenBackup(t, 'work.ink') },
  { name: 'sub2unlock', hosts: ['sub2unlock.com', 'sub2get.com', 'sub2unlock.net', 'sub2unlock.io'], run: (t) => handleWithDirectThenBackup(t, 'sub2unlock') },
  { name: 'sfl.gl', hosts: ['sfl.gl'], run: (t) => handleWithDirectThenBackup(t, 'sfl.gl') },
  { name: 'boost.ink', hosts: ['boost.ink', 'bst.ink', 'mboost.me', 'booo.st'], run: (t) => handleWithDirectThenBackup(t, 'boost.ink') },
  { name: 'platoboost', hosts: ['platoboost.com', 'platorelay.com', 'auth.platorelay.com', 'gateway.platoboost.com'], run: async () => handleKeySystem('Platoboost') },
  { name: 'lootlabs', hosts: ['lootlabs.gg', 'loot-link.com', 'lootdest.org', 'lootlinks.com'], run: (t) => handleMultiApiOnly(t, 'LootLabs') },
  { name: 'lockr', hosts: ['lockr.so', 'lockr.social'], run: (t) => handleMultiApiOnly(t, 'LockR') },
  { name: 'rekonise', hosts: ['rekonise.com'], run: (t) => handleMultiApiOnly(t, 'Rekonise') },
  { name: 'adsmore', hosts: ['adsmore.com', 'adsmore.co'], run: (t) => handleMultiApiOnly(t, 'Adsmore') },
  { name: 'luarmor', hosts: ['luarmor.net', 'api.luarmor.net', 'luarmor.com'], run: async () => handleKeySystem('Luarmor') },
];

function matchProvider(hostname) {
  const h = (hostname || '').toLowerCase();
  return PROVIDERS.find((p) => p.hosts.some((d) => h === d || h.endsWith('.' + d)));
}

// INI YANG GW BENERIN: pake export default, bukan module.exports
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (req.query && (req.query.check === '1' || req.query.check === 'true')) {
    return res.status(200).json({ success: true, online: true, time: new Date().toISOString(), providers: PROVIDERS.map((p) => p.name) });
  }

  const raw = String((req.query && req.query.url) || '').trim();
  if (!raw || raw.length > 2048) return res.status(400).json({ success: false, error: 'Parameter url kosong atau terlalu panjang' });

  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).json({ success: false, error: 'Link tidak valid' }); }
  if (!/^https?:$/i.test(parsed.protocol) || parsed.username || parsed.password) return res.status(400).json({ success: false, error: 'Link tidak valid' });

  const provider = matchProvider(parsed.hostname);
  if (!provider) return res.status(400).json({ success: false, error: 'Provider tidak didukung: ' + parsed.hostname });

  try {
    const result = await provider.run(parsed.toString());
    if (result && result.isKeySystem) return res.status(200).json(result);
    if (!result || typeof result !== 'string') throw new Error('Tidak ada hasil dari provider ' + provider.name);
    return res.status(200).json({ success: true, result, provider: provider.name });
  } catch (e) {
    const msg = e && e.name === 'AbortError' ? 'Timeout saat menghubungi server ' + provider.name : e.message || 'Bypass gagal';
    const friendly = /fetch failed|Failed to fetch|network/i.test(msg) ? 'Server lagi sibuk atau sedang maintenance. Coba lagi 5-10 detik.' : msg;
    return res.status(502).json({ success: false, error: friendly, provider: provider.name });
  }
  }
