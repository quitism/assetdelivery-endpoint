import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/thumbnail", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "Missing id param" });

    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${id}&size=420x420&format=Png`;
    const robloxRes = await fetch(url);
    const data = await robloxRes.json();

    res.set("Access-Control-Allow-Origin", "*");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch Roblox data" });
  }
});

app.listen(PORT, () => {
  console.log(`proxy listening on port ${PORT}`);
});
