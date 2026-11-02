export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  const { url } = req.query;
  if (!url) return res.json({ success: false, error: "URL kosong" });
  const lower = url.toLowerCase();
  const UA = "Mozilla/5.0";
  try {
    let result = "";
    const fetchText = async (u) => {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      return r.text();
    };
    if (lower.includes("lootlabs") || lower.includes("loot-link") || lower.includes("lootdest") || lower.includes("lootlabs.gg")) {
      const html = await fetchText(url);
      const m = html.match(/https:\/\/lootdest\.org\/s\?[^"'\s]+/);
      result = m ? m[0] : "";
    } else if (lower.includes("platorelay") || lower.includes("platoboost") || lower.includes("gateway.platoboost")) {
      const u = new URL(url);
      let id = u.searchParams.get("id") || u.searchParams.get("d");
      if (!id && url.includes("/a/")) id = url.split("/a/")[1].split(/[?\/]/)[0];
      if (!id) throw new Error("ID platoboost tidak ada");
      const r = await fetch(`https://platorelay.com/api/bypass?id=${id}`, { headers: { "User-Agent": UA, Referer: "https://platorelay.com/" } });
      const j = await r.json().catch(()=>({}));
      result = j.result || j.bypass || j.key || "";
    } else if (lower.includes("linkvertise") || lower.includes("link-to.net") || lower.includes("up-to-down")) {
      const r = await fetch(`https://bypass.bot.nu/bypass2?url=${encodeURIComponent(url)}`);
      const j = await r.json().catch(()=>({}));
      result = j.destination || j.result || j.url || "";
    } else if (lower.includes("work.ink") || lower.includes("sub2unlock") || lower.includes("sub2get") || lower.includes("sub4unlock")) {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA } });
      result = r.headers.get("location") || "";
      if (!result) {
        const b = await fetch(`https://api.bypass.vip/bypass?url=${encodeURIComponent(url)}`);
        const bj = await b.json().catch(()=>({}));
        result = bj.result || bj.destination || "";
      }
    } else if (lower.includes("sfl.gl") || lower.includes("sflink")) {
      const r = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA } });
      result = r.headers.get("location") || "";
    } else if (lower.includes("boost.ink") || lower.includes("bst.ink") || lower.includes("boostf")) {
      const r = await fetch(`https://api.boost.ink/v1/bypass?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } });
      const j = await r.json().catch(()=>({}));
      result = j.result || j.url || "";
      if (!result) {
        const r2 = await fetch(url, { redirect: "manual", headers: { "User-Agent": UA } });
        result = r2.headers.get("location") || "";
      }
    } else if (lower.includes("lockr") || lower.includes("rekonise")) {
      const html = await fetchText(url);
      const m2 = html.match(/window\.location\s*=\s*"([^"]+)"/);
      result = m2 ? m2[1] : "";
    } else {
      throw new Error("Provider tidak didukung: " + new URL(url).hostname);
    }
    if (!result) throw new Error("Hasil kosong, link mungkin expired");
    return res.json({ success: true, result });
  } catch (e) {
    return res.json({ success: false, error: e.message });
  }
        }
