module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { followups } = req.body || {};
  if (!Array.isArray(followups)) {
    return res.status(400).json({ error: 'followups must be an array' });
  }

  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return res.status(500).json({ error: 'Upstash env vars not configured for this environment' });
  }

  // Validate URL before attempting fetch to avoid unhandled TypeError
  try { new URL(url); } catch {
    return res.status(500).json({ error: 'UPSTASH_REDIS_REST_URL is not a valid URL' });
  }

  try {
    await fetch(`${url}/set/network_followups`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(JSON.stringify(followups)), // Upstash stores as string
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to reach Upstash: ' + e.message });
  }

  return res.status(200).json({ ok: true, saved: followups.length });
};
