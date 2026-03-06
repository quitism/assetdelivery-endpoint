const ALLOWED_ORIGINS = [
  "https://cw-litterbox.netlify.app",
  "https://catlua.netlify.app"
];

export function checkOrigin(req, res) {
  const origin = req.headers["origin"] || "";
  const referer = req.headers["referer"] || "";
  const allowed = ALLOWED_ORIGINS.some(o => origin === o || referer.startsWith(o));
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

export function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const jitter = base => base + Math.floor(Math.random() * 200);

export async function fetchWithRetries(url, opts = {}, { maxRetries = 2, name = "fetch" } = {}) {
  let attempt = 0;
  while (true) {
    attempt++;
    const start = Date.now();
    let res;
    try {
      res = await fetch(url, opts);
    } catch (err) {
      console.error(`[${name}] attempt ${attempt} NETWORK ERROR ${url} (${Date.now()-start}ms)`, err.message);
      if (attempt > maxRetries) throw err;
      await sleep(jitter(100 * Math.pow(2, attempt)));
      continue;
    }

    const duration = Date.now() - start;
    let text = null;
    try { text = await res.text(); } catch (readErr) {
      if (attempt > maxRetries) throw readErr;
      await sleep(jitter(100 * Math.pow(2, attempt)));
      continue;
    }

    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}

    console.log(`[${name}] attempt ${attempt} ${res.status} ${url} — ${duration}ms`);

    const tooMany = res.status === 429 ||
      (json?.errors?.some?.(e => e.message?.toLowerCase().includes("too many"))) ||
      (json?.code === 0 && json?.message?.toLowerCase().includes("too many"));

    if (tooMany) {
      if (attempt > maxRetries) return { status: res.status, ok: res.ok, text, json, headers: Object.fromEntries(res.headers.entries()) };
      await sleep(jitter(200 * Math.pow(2, attempt)));
      continue;
    }

    return { status: res.status, ok: res.ok, text, json, headers: Object.fromEntries(res.headers.entries()) };
  }
}

// in-memory cache (per instance, good enough for serverless)
export const thumbnailCache = new Map();
export const DEFAULT_TTL_MS = 30 * 60 * 1000;