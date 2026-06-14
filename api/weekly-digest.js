const twilio = require('twilio');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // IST date
  const nowUtc  = new Date();
  const istMs   = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const weekLabel = istDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  let digest = null;

  if (req.method === 'POST' && req.body && req.body.digest) {
    // Manual trigger from dashboard — data supplied in body
    digest = req.body.digest;
  } else {
    // Cron trigger — read stored digest from Upstash Redis
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      return res.status(500).json({ error: 'Upstash env vars not configured' });
    }
    const kvRes  = await fetch(`${url}/get/pipeline_digest`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const kvJson = await kvRes.json();
    digest = kvJson.result ? JSON.parse(kvJson.result) : null;
  }

  if (!digest) {
    return res.status(200).json({ ok: true, sent: false, reason: 'No digest data available — sync from dashboard first' });
  }

  // Check if digest is enabled
  if (digest.digestEnabled === false) {
    return res.status(200).json({ ok: true, sent: false, reason: 'Weekly digest is disabled' });
  }

  // Build WhatsApp message
  const pipeline  = digest.pipeline  || [];
  const investors = digest.investors || 0;
  const startups  = digest.startups  || 0;
  const partners  = digest.partners  || 0;

  // Count by stage
  const stageMap = {};
  pipeline.forEach(deal => {
    const s = deal.stage || 'Unknown';
    stageMap[s] = (stageMap[s] || 0) + 1;
  });

  // Hot deals
  const hotDeals = pipeline.filter(d => d.hot);

  // Build lines
  const lines = [
    `📊 *Log7 Capital — Weekly Pipeline Digest*`,
    `_Week of ${weekLabel}_`,
    '',
    `*Pipeline: ${pipeline.length} active deal${pipeline.length !== 1 ? 's' : ''}*`,
  ];

  const stages = Object.entries(stageMap).sort((a, b) => b[1] - a[1]);
  if (stages.length) {
    stages.forEach(([s, n]) => lines.push(`  • ${s}: ${n}`));
  }

  if (hotDeals.length) {
    lines.push('');
    lines.push(`*🔥 Hot Deals (${hotDeals.length}):*`);
    hotDeals.slice(0, 5).forEach(d => {
      const name = [d.investor, d.startup].filter(Boolean).join(' ↔ ');
      lines.push(`  • ${name}${d.stage ? ` (${d.stage})` : ''}`);
    });
  }

  lines.push('');
  lines.push(`*Network:* ${investors} Investors | ${startups} Startups | ${partners} Partners`);

  if (digest.note) {
    lines.push('');
    lines.push(`_${digest.note}_`);
  }

  lines.push('');
  lines.push(`_Sent by Log7 Dashboard · ${weekLabel}_`);

  const body = lines.join('\n');

  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !auth || !process.env.TWILIO_FROM || !process.env.TWILIO_TO) {
    return res.status(500).json({ error: 'Twilio env vars not configured' });
  }

  const client = twilio(sid, auth);
  await client.messages.create({
    from: process.env.TWILIO_FROM,
    to:   process.env.TWILIO_TO,
    body,
  });

  return res.status(200).json({ ok: true, sent: true, deals: pipeline.length, date: istDate.toISOString().slice(0, 10) });
};
