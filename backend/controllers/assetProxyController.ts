import { Request, Response } from "express";
import axios from "axios";
import https from "https";

/**
 * Catch-all handler for assets (JS chunks, fonts, images) that
 * SPAs dynamically import. The Referer header tells us which
 * proxied site they came from so we can fetch the right origin.
 */
export const proxyAsset = async (req: Request, res: Response) => {
  const referer = req.get("referer") || req.get("origin") || "";

  // Extract the original site URL from the referer
  let originSite = "";
  try {
    const refUrl = new URL(referer);
    // Referer looks like: http://localhost:5000/api/proxy?url=https%3A%2F%2Fexample.com
    const proxiedParam = refUrl.searchParams.get("url");
    if (proxiedParam) {
      const proxied = new URL(proxiedParam);
      originSite = proxied.origin;
    } else {
      // Referer is just the proxied page itself
      originSite = refUrl.origin;
    }
  } catch {
    return res.status(400).send("Cannot determine origin from Referer");
  }

  if (!originSite) return res.status(400).send("No origin found in Referer");

  // Build the full asset URL
  const assetPath = req.path; // e.g. /assets/McpServer-MmQrLigK.js
  const assetUrl = `${originSite}${assetPath}${req.query && Object.keys(req.query).length ? '?' + new URLSearchParams(req.query as any).toString() : ''}`;

  try {
    const response = await axios.get(assetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Referer: originSite,
      },
      timeout: 15000,
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      responseType: "arraybuffer",
      validateStatus: () => true,
    });

    if (response.status >= 400) {
      return res.status(response.status).send(`Asset not found: ${assetUrl}`);
    }

    const contentType = (response.headers["content-type"] as string) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (response.headers["cache-control"]) {
      res.setHeader("Cache-Control", response.headers["cache-control"] as string);
    }
    res.send(response.data);
  } catch (err: any) {
    console.error("Asset proxy error:", assetUrl, err.message);
    res.status(500).send(`Failed to fetch asset: ${err.message}`);
  }
};
