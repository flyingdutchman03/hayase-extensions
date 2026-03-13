// TokyoTosho Hayase Extension
// Searches TokyoTosho for subtitled anime (type=1)

const BASE = "https://www.tokyotosho.info";

function parseRssItems(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const items = Array.from(doc.querySelectorAll("item"));

  return items.map((item) => {
    const get = (tag) => item.querySelector(tag)?.textContent?.trim() ?? "";

    const enclosure = item.querySelector("enclosure");
    const torrentUrl = enclosure?.getAttribute("url") || get("link") || "";

    const guid = get("guid");
    const hash = /^[0-9a-fA-F]{40}$/.test(guid) ? guid.toLowerCase() : null;

    const desc = get("description");
    const sizeMatch = desc.match(/Size:\s*([\d.,]+\s*\w+)/i);
    const size = sizeMatch ? sizeMatch[1] : null;

    return {
      title: get("title"),
      torrentUrl,
      hash,
      size,
      seeders: 0,
      leechers: 0,
    };
  });
}

function toResult(item) {
  const magnet = item.hash
    ? `magnet:?xt=urn:btih:${item.hash}&dn=${encodeURIComponent(item.title)}&tr=http%3A%2F%2Fnyaa.tracker.wf%3A7777%2Fannounce&tr=udp%3A%2F%2Fopen.stealth.si%3A80%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce`
    : null;

  return {
    title: item.title,
    magnet,
    torrent: item.torrentUrl || null,
    hash: item.hash,
    seeders: item.seeders,
    leechers: item.leechers,
    accuracy: "high",
    extra: item.size ? { size: item.size } : undefined,
  };
}

export async function byTitle(title, episode) {
  const query = episode != null
    ? `${title} ${String(episode).padStart(2, "0")}`
    : title;

  const url = `${BASE}/search.php?terms=${encodeURIComponent(query)}&type=1&offset=0`;

  const res = await fetch(url, {
    headers: { Accept: "application/rss+xml, text/xml, */*" },
  });

  if (!res.ok) throw new Error(`TokyoTosho search failed: ${res.status}`);

  const xml = await res.text();
  return parseRssItems(xml).map(toResult).filter((r) => r.title);
}

export async function byAnilist(media, episode) {
  const title =
    media?.title?.english ||
    media?.title?.romaji ||
    media?.title?.native ||
    "";

  if (!title) return [];
  return byTitle(title, episode);
}

export async function dash() {
  const url = `${BASE}/rss.php?type=1`;

  const res = await fetch(url, {
    headers: { Accept: "application/rss+xml, text/xml, */*" },
  });

  if (!res.ok) throw new Error(`TokyoTosho RSS failed: ${res.status}`);

  const xml = await res.text();
  return parseRssItems(xml).map(toResult).filter((r) => r.title);
}
