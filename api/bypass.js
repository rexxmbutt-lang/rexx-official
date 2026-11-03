// api/bypass.js - V2.2 PLATOBOOST + LUARMOR + JNKE
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { url, check } = req.query;
  if (check !== undefined) return res.status(200).send(`<html><body style="background:#0a0a0b;color:#fff;font-family:monospace;padding:20px"><h2>REXX V2.2 ONLINE</h2><p>✓ work.ink / jnkie / sfl.gl = AUTO<br>✓ platoboost / luarmor = SEMI-AUTO</p></body></html>`);
  if (!url) return res.status(400).json({ success: false, error: 'URL kosong' });
  async function safeJson(r){const t=await r.text();try{return JSON.parse(t)}catch{return {_raw:t}}}

  // 1. DIRECT BYPASS (work.ink, jnkie, sfl.gl, boost.ink, sub2unlock)
  try {
    if (/(work\.ink|sfl\.gl|boost\.ink|sub2unlock|jnkie\.com)/i.test(url)) {
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': url }, redirect: 'manual' });
      const loc = r.headers.get('location');
      if (loc && loc.startsWith('http') && !/(work\.ink|sfl\.gl|boost\.ink|jnkie)/i.test(loc)) {
        return res.json({ success: true, bypassed: loc, method: 'direct' });
      }
      const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
      const m = html.match(/"destination"\s*:\s*"([^"]+)"/i) || html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/i);
      if (m) return res.json({ success: true, bypassed: m[1], method: 'direct-html' });
    }
  } catch {}

  // 2. PLATOBOOST SEMI-AUTO (COBA API DULU)
  try {
    if (/platoboost/i.test(url)) {
      const idMatch = url.match(/\/p\/([a-zA-Z0-9]+)/) || url.match(/id=([a-zA-Z0-9]+)/);
      const id = idMatch ? idMatch[1] : null;
      if (id) {
        // Tembak API platoboost langsung, kadang bisa dapet tanpa checkpoint
        const apiTry = await fetch(`https://api.platoboost.com/api/v1/whitelist/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(()=>null);
        if (apiTry && apiTry.ok) {
          const data = await safeJson(apiTry);
          const keyUrl = data.key || data.url || data.destination;
          if (keyUrl) return res.json({ success: true, bypassed: keyUrl, method: 'platoboost-api' });
        }
      }
      // Kalau API gagal = butuh checkpoint, return mode manual
      return res.json({ success: false, isKeySystem: true, error: 'KEY SYSTEM DETECTED', message: 'Platoboost butuh checkpoint 3 step. Klik tombol MANUAL di web, tunggu 10 detik, baru dapet key.', manualUrl: url });
    }
  } catch {}

  // 3. LUARMOR SEMI-AUTO
  try {
    if (/luarmor/i.test(url)) {
      const html = await (await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
      const m = html.match(/https:\/\/[^"\s']+\.luarmor\.cc\/[^"\s']+/i) || html.match(/"key"\s*:\s*"([^"]+)"/i);
      if (m && m[0].startsWith('http')) return res.json({ success: true, bypassed: m[0], method: 'luarmor-scrape' });
      return res.json({ success: false, isKeySystem: true, error: 'KEY SYSTEM DETECTED', message: 'Luarmor butuh solve 3 step. Klik MANUAL, selesaikan checkpoint, key langsung keluar.', manualUrl: url });
    }
  } catch {}

  // 4. MULTI API BUAT LINKVERTISE, LOOTLABS, LOCKR, REKONISE, ADSMORE
  const apis = [
    `https://bypass.vip/api?url=${encodeURIComponent(url)}`,
    `https://api.bypass2.8pe.net/bypass?url=${encodeURIComponent(url)}`,
    `https://bypass-api.trab.id/bypass?url=${encodeURIComponent(url)}`,
  ];
  for (const apiUrl of apis) {
    try {
      const r = await fetch(apiUrl, { headers: { 'User-Agent': 'REXX-V2.2' } });
      const data = await safeJson(r);
      const result = data.destination || data.result || data.bypassed || data.url || data.link;
      if (result && result.startsWith('http')) return res.json({ success: true, bypassed: result, api: apiUrl });
    } catch { continue; }
  }
  return res.json({ success: false, error: 'Gagal semua, coba lagi 5 detik' });
                            }
