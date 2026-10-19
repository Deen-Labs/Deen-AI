// Serverless proxy endpoint for Deen AI (Imam AI)
// Forwards mobile chat requests to Google Generative Language API without exposing client keys.

const ipRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute per IP

function isRateLimited(ip) {
  const now = Date.now();
  const record = ipRateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  record.count += 1;
  return false;
}

// Clean up stale rate-limit records periodically
if (ipRateLimitMap.size > 1000) {
  const now = Date.now();
  for (const [key, value] of ipRateLimitMap.entries()) {
    if (now > value.resetAt) {
      ipRateLimitMap.delete(key);
    }
  }
}

export default async function handler(req, res) {
  // CORS Preflight
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-deen-client");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1. Shared Client Header Check
  const clientHeader = req.headers["x-deen-client"];
  if (clientHeader !== "deen-ai-v2.1.5") {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing client header" });
  }

  // 2. Basic Rate Limiting
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown-ip";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too Many Requests: Rate limit exceeded" });
  }

  // 3. Request Validation
  const { model, contents, systemInstruction, generationConfig } = req.body || {};

  if (!contents || !Array.isArray(contents) || contents.length === 0) {
    return res.status(400).json({ error: "Invalid payload: contents array is required" });
  }

  const modelToUse = model || "gemini-3.5-flash-lite";

  // 4. API Key Resolution (Primary + Optional Secondary Quota Rotation)
  const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
  ].filter(Boolean);

  if (apiKeys.length === 0) {
    console.error("[ImamChat Proxy] GEMINI_API_KEY is not configured on the server");
    return res.status(500).json({ error: "Server configuration error: Gemini API key missing" });
  }

  // 5. Forward to Google Generative Language API
  let lastError = null;

  for (const apiKey of apiKeys) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelToUse)}:generateContent?key=${apiKey}`;

    const payload = {
      contents,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: generationConfig || {
        maxOutputTokens: 4096,
        temperature: 0.25,
      },
    };

    try {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        console.warn(`[ImamChat Proxy] API key quota exhausted (429) for model ${modelToUse}, checking next key...`);
        lastError = { status: 429, message: "Quota exhausted" };
        continue;
      }

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || response.statusText;
        console.warn(`[ImamChat Proxy] Gemini API error (${response.status}): ${errorMsg}`);
        lastError = { status: response.status, message: errorMsg, details: data };
        continue;
      }

      // Extract text content if available for convenience
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return res.status(200).json({
        ...data,
        text,
      });
    } catch (err) {
      console.error(`[ImamChat Proxy] Network error calling Gemini:`, err);
      lastError = { status: 502, message: err.message || "Failed to reach Google Gemini API" };
    }
  }

  return res.status(lastError?.status || 500).json({
    error: lastError?.message || "Failed to process chat completion",
    details: lastError?.details,
  });
}
