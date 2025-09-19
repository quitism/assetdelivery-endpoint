const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to enable CORS for all origins
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Proxy endpoint for Roblox assets
app.get('/asset/:assetId', async (req, res) => {
  const assetId = req.params.assetId;
  const robloxAssetUrl = `https://assetdelivery.roblox.com/v1/asset?id=${assetId}`;

  // Retrieve the Roblox security cookie from environment variables
  const robloxSecurityCookie = process.env.ROBLOX_SECURITY_COOKIE;

  if (!robloxSecurityCookie) {
    console.error('ROBLOX_SECURITY_COOKIE environment variable is not set.');
    return res.status(500).send('Server configuration error: Roblox security cookie is missing.');
  }

  try {
    const response = await fetch(robloxAssetUrl, {
      headers: {
        'Cookie': `.ROBLOSECURITY=${robloxSecurityCookie}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch asset ${assetId}: ${response.status} ${response.statusText}`);
      return res.status(response.status).send(`Failed to fetch asset: ${response.statusText}`);
    }

    // Set appropriate headers from the Roblox response
    response.headers.forEach((value, name) => {
      // Avoid setting 'Set-Cookie' header from Roblox response
      if (name.toLowerCase() !== 'set-cookie') {
        res.setHeader(name, value);
      }
    });

    // Stream the asset content directly to the client
    response.body.pipe(res);

  } catch (error) {
    console.error(`Error proxying asset ${assetId}:`, error);
    res.status(500).send('Internal server error while proxying asset.');
  }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on port ${PORT}`);
});
