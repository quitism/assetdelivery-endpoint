import { checkOrigin, setCORS, fetchWithRetries } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCORS(res); return res.status(200).end(); }
  if (!checkOrigin(req, res)) return;
  setCORS(res);

  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id param" });

    const result = await fetchWithRetries(
      `https://assetdelivery.roblox.com/v1/assetId/${id}`,
      {},
      { maxRetries: 3, name: "audio" }
    );

    const data = result.json ?? null;
    if (!data?.location) {
      return res.status(404).json({ error: "Audio location not found", raw: data ?? result.text });
    }

    res.redirect(data.location);
  } catch (err) {
    console.error("[audio] error", err);
    res.status(500).json({ error: "Failed to resolve audio" });
  }
}