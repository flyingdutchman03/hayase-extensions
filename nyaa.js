const BASE = "https://nyaa.si";

function parseRssItems(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const items = Array.from(doc.querySelectorAll("item"));
  return items.map((item) => {
    const get = (tag) => item.querySelector(tag)?.textContent?.trim() ?? "";
    const hash = get("nyaa\\:infoHash") || get("infoHash") || null;
    const seeders = parseInt(get("nyaa\\:seeders") || get("seeders") || "0", 10);
    const leechers = parseInt(get("nyaa\\:leechers") || get("leechers") || "0", 10);
    const size = get("nyaa\\:size") || get("size") || null;
    const link = get("link");
    return {
      title: get("title"),
      torrentUrl: link ? `https://nyaa.si${link}.torrent` : null,
      hash: hash ? hash.toLowerCase() : null,
      size, seeders, leechers,
    };
  });
}

function toResult(item) {
  const magnet = item.hash
    ? `magnet:?xt=urn:btih:${item.hash}&dn=${encodeURIComponent(item.title)}&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce`
    : null;
  return {
    title: item.title,
    magnet,
    torrent: item.torrentUrl || null,
    hash: item.hash,
    seeders: item.seeders,
    leechers: item.leechers,
    accuracy: "high",
  };
}

async function fetchRss(params) {
  const url = `${BASE}/?page=rss&c=1_2&${params}`;
  const res = await fetch(url, { headers: { Accept: "application/rss+xml, text/xml, */*" } });
  if (!res.ok) throw new Error(`Nyaa fetch failed: ${res.status}`);
  return res.text();
}

export async function byTitle(title, episode) {
  const query = episode != null ? `${title} ${String(episode).padStart(2, "0")}` : title;
  const xml = await fetchRss(`q=${encodeURIComponent(query)}`);
  return parseRssItems(xml).map(toResult).filter((r) => r.title);
}

export async function byAnilist(media, episode) {
  const title = media?.title?.english || media?.title?.romaji || media?.title?.native || "";
  if (!title) return [];
  return byTitle(title, episode);
}

export async function dash() {
  const xml = await fetchRss("s=id&o=desc");
  return parseRssItems(xml).map(toResult).filter((r) => r.title);
}
