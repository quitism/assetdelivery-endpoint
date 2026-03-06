import { checkOrigin, setCORS, fetchWithRetries, thumbnailCache, DEFAULT_TTL_MS } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCORS(res); return res.status(200).end(); }
  if (!checkOrigin(req, res)) return;
  setCORS(res);

  try {
    const raw = req.query.id;
    if (!raw) return res.status(400).json({ error: "Missing id param" });

    const reqIds = [...new Set(raw.split(",").map(s => s.trim()).filter(Boolean))];
    if (!reqIds.length) return res.status(400).json({ error: "No valid ids" });

    const responseData = [];
    const missingIds = [];

    for (const id of reqIds) {
      const cached = thumbnailCache.get(id);
      if (cached && Date.now() < cached.expires) {
        responseData.push(cached.entry);
      } else {
        missingIds.push(id);
      }
    }

    if (missingIds.length > 0) {
      const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${encodeURIComponent(missingIds.join(","))}&size=420x420&format=Png`;
      const result = await fetchWithRetries(url, {}, { maxRetries: 4, name: "thumbnail" });

      const payload = result.json ?? { data: [] };
      const items = Array.isArray(payload.data) ? payload.data : [];
      const byId = new Map(items.map(item => [String(item.assetId ?? item.targetId ?? item.id), item]));

      for (const id of missingIds) {
        const entry = byId.get(id) ?? { assetId: Number(id), state: "Error", errorMessage: "Not found" };
        thumbnailCache.set(id, { expires: Date.now() + DEFAULT_TTL_MS, entry });
        responseData.push(entry);
      }
    }

    res.json({ data: responseData });
  } catch (err) {
    console.error("[thumbnail] error", err);
    res.status(500).json({ error: "Internal error" });
  }
}