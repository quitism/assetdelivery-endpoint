import { checkOrigin, setCORS, fetchWithRetries } from "./_utils.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { setCORS(res); return res.status(200).end(); }
  if (!checkOrigin(req, res)) return;
  setCORS(res);

  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id param" });

    const headers = {};
    if (process.env.ROBLOSECURITY) headers.Cookie = `.ROBLOSECURITY=${process.env.ROBLOSECURITY}`;

    const result = await fetchWithRetries(
      `https://assetdelivery.roblox.com/v1/assetId/${id}`,
      { headers },
      { maxRetries: 3, name: "asset" }
    );

    const data = result.json ?? (result.text ? (() => { try { return JSON.parse(result.text); } catch { return { raw: result.text }; } })() : null);
    res.json(data);
  } catch (err) {
    console.error("[asset] error", err);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
}