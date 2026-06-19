// Ensure the Upstash REST URL is an absolute https URL with no trailing slash.
// A bare host (e.g. "xxx.upstash.io", missing scheme) passes a truthy check but
// makes fetch() throw "TypeError: Failed to parse URL" — the 500 seen in prod.
function normalizeUpstashUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try { new URL(u); } catch { return null; }
  return u;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Vercel parses JSON bodies automatically, but tolerate a raw string body too
  // (e.g. sendBeacon / text/plain) instead of letting JSON.parse blow up.
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try { parsedBody = JSON.parse(parsedBody); }
    catch (e) {
      console.error(`[save-followups] body is a string but not valid JSON: ${e.message}`);
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
  }

  const { followups } = parsedBody || {};
  if (!Array.isArray(followups)) {
    return res.status(400).json({ error: 'followups must be an array' });
  }

  const base  = normalizeUpstashUrl(process.env.UPSTASH_REDIS_REST_URL);
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) {
    console.error('[save-followups] Upstash env vars missing/invalid', {
      hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      urlValid: !!base,
      hasToken: !!token,
    });
    return res.status(500).json({ error: 'Upstash env vars not configured or URL is not a valid absolute https URL' });
  }

  const target  = `${base}/set/network_followups`;
  const payload = JSON.stringify(JSON.stringify(followups)); // Upstash stores as string

  try {
    // Log the real URL + body size BEFORE the fetch so a parse/network failure
    // is attributable in Vercel runtime logs (token stays in the header, never the URL).
    console.log(`[save-followups] writing snapshot → ${target} (items=${followups.length} bytes=${payload.length})`);
    const r = await fetch(target, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    payload,
    });
    const text = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* Upstash returned non-JSON (e.g. HTML error page) */ }
    if (!r.ok || (parsed && parsed.error)) {
      console.error(`[save-followups] Upstash write failed status=${r.status} body=${text.slice(0, 300)}`);
      return res.status(502).json({ error: 'Upstash write failed', status: r.status, detail: (parsed && parsed.error) || text.slice(0, 300) });
    }
    return res.status(200).json({ ok: true, saved: followups.length, result: parsed && parsed.result });
  } catch (err) {
    console.error(`[save-followups] fetch threw url=${target} err=${err.name}: ${err.message}`);
    return res.status(502).json({ error: 'Failed to reach Upstash', detail: err.message });
  }
};
