const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  // Allow dashboard origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { followups } = req.body || {};
  if (!Array.isArray(followups)) {
    return res.status(400).json({ error: 'followups must be an array' });
  }

  await kv.set('network_followups', followups);
  return res.status(200).json({ ok: true, saved: followups.length });
};
