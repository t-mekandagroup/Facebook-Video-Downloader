const RAPIDAPI_HOST = "facebook-reel-and-video-downloader.p.rapidapi.com";
const RAPIDAPI_ENDPOINT = `https://${RAPIDAPI_HOST}/app/main.php`;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

function isFacebookUrl(value) {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    return host === "facebook.com" ||
      host === "m.facebook.com" ||
      host === "fb.watch" ||
      host.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return json(500, {
      error: "RapidAPI key is not configured in Netlify Environment Variables."
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON request." });
  }

  const url = String(body.url || "").trim();

  if (!url) {
    return json(400, { error: "Facebook URL is required." });
  }

  if (url.length > 2000 || !isFacebookUrl(url)) {
    return json(400, {
      error: "Please enter a valid Facebook Reel or video URL."
    });
  }

  try {
    const apiUrl = `${RAPIDAPI_ENDPOINT}?url=${encodeURIComponent(url)}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": apiKey
      }
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return json(response.status, {
        error: data?.message || data?.error ||
          `RapidAPI returned HTTP ${response.status}`,
        details: data
      });
    }

    return json(200, { success: true, data });
  } catch (error) {
    console.error("RapidAPI request failed:", error);
    return json(502, {
      error: "Could not contact the Facebook downloader API."
    });
  }
};
