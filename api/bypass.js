// api/bypass.js - V2 DIRECT BYPASS (REXX OFFICIAL ANTI KECEWA)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, check } = req.query;

  if (check !== undefined) {
    return res.status(200).send(`<html><head><style>body{background:#0a0a0b;color:#fff;font-family:monospace;padding:20px}.ok{color:#00ff88}</style></head><body><h2>REXX V2 - ONLINE</h2><p><span class="ok">✓</span> Direct Bypass ACTIVE</p><p><span class="ok">✓</span> safeJson ACTIVE</p><p><span class="ok">✓</span> Multi API ACTIVE</p><p><span class="ok">✓</span> Ready for 5k member</p></body></html>`);
  }
  if (!url) return res.status(400).json({ success: false, error: 'URL kosong' });

  // ANTI JSON ERROR
  async function safeJson(r) {
    const t = await r.text();
    try { return JSON.parse(t); } catch { return { _raw: t }; }
  }

  // 1. DIRECT BYPASS work.ink / sfl.gl / boost.ink / sub2unlock
  // Ini bongkar HTML nya langsung, gak numpang API orang
  try {
    if (url.includes('work.ink') || url.includes('sfl.gl') || url.includes('boost.ink') || url.includes('sub2unlock')) {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Referer': url },
        redirect: 'manual'
      });
      const location = r.headers.get('location');
      if (location && location.startsWith('http') && !location.includes('work.ink') && !location.includes('sfl.gl')) {
        return res.json({ success: true, bypassed: location, method: 'direct-redirect' });
      }
      // Kalau gak redirect, bongkar isi HTML
      const htmlRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await htmlRes.text();
      const match = html.match(/https?:\/\/(?:www\.)?(?:loot-links|linkvertise|workink|rebrand\.ly)[^\s"'<>]+/i) || html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
      if (match) {
        const finalUrl = match[1] || match[0];
        if (finalUrl.startsWith('http')) return res.json({ success: true, bypassed: finalUrl, method: 'direct-html' });
      }
    }
  } catch {}

  // 2. MULTI API (3 cadangan biar gak mati)
  const apis = [
    `https://bypass.vip/api?url=${encodeURIComponent(url)}`,
    `https://api.bypass2.8pe.net/bypass?url=${encodeURIComponent(url)}`, // cadangan 1
    `https://bypass-api.trab.id/bypass?url=${encodeURIComponent(url)}`, // cadangan 2
  ];

  for (const apiUrl of apis) {
    try {
      const r = await fetch(apiUrl, { headers: { 'User-Agent': 'REXX-OFFICIAL-V2' } });
      const data = await safeJson(r);
      const result = data.destination || data.result || data.bypassed || data.url || data.link || data.success;
      if (result && typeof result === 'string' && result.startsWith('http')) {
        return res.json({ success: true, bypassed: result, raw: data, api: apiUrl });
      }
    } catch (e) { continue; }
  }

  // 3. KHUSUS PLATOBOOST & LUARMOR - KASIH PESAN JUJUR
  if (url.includes('plati') || url.includes('luarmor') || url.includes('lootlabs') || url.includes('linkvertise')) {
    return res.json({ 
      success: false, 
      error: 'KEY SYSTEM DETECTED',
      message: 'Link ini pake platoboost/luarmor. Ini bukan error web lu, tapi butuh solver khusus. Suruh member complete manual atau pake jasa bypass key premium.',
      isKeySystem: true
    });
  }

  return res.json({ success: false, error: 'Semua backend gagal, coba ganti link atau coba lagi 5 detik' });
                                                  }
