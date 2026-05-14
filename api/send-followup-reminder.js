const twilio = require('twilio');

module.exports = async function handler(req, res) {
  // Today's date in IST (UTC+5:30)
  const nowUtc = new Date();
  const istMs  = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const today   = istDate.toISOString().slice(0, 10); // YYYY-MM-DD

  let followups = [];

  if (req.method === 'POST' && req.body && Array.isArray(req.body.followups)) {
    // Manual trigger from dashboard — use the follow-ups sent in the request body
    followups = req.body.followups;
  } else {
    // Cron job — read from Upstash Redis
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      return res.status(500).json({ error: 'Upstash env vars not configured' });
    }
    const kvRes  = await fetch(`${url}/get/network_followups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const kvJson = await kvRes.json();
    const all    = kvJson.result ? JSON.parse(kvJson.result) : [];
    // Cron: filter for entries due today (IST)
    followups = all.filter(f => f.followUpDate === today && f.name);
  }

  if (!followups.length) {
    return res.status(200).json({ ok: true, sent: false, reason: 'No follow-ups due today' });
  }

  // Group by tab
  const groups = { investors: [], startups: [], partnerships: [] };
  followups.forEach(f => {
    const tab = f.tab in groups ? f.tab : 'partnerships';
    groups[tab].push(f);
  });

  // Format date label from IST date
  const dateLabel = istDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  // Build WhatsApp message
  const lines = [`📋 *Log7 Capital — Follow-ups for ${dateLabel}*\n`];
  [
    { key: 'investors',    label: 'Investors' },
    { key: 'startups',     label: 'Startups' },
    { key: 'partnerships', label: 'Partnerships' },
  ].forEach(({ key, label }) => {
    if (!groups[key].length) return;
    lines.push(`*${label}:*`);
    groups[key].forEach(f => {
      const snippet = (f.notes || '').trim().slice(0, 60);
      lines.push(`• ${f.name}${snippet ? ` — ${snippet}` : ''}`);
    });
    lines.push('');
  });
  lines.push(`Total: ${followups.length} follow-up${followups.length > 1 ? 's' : ''} today.`);

  const body = lines.join('\n');

  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  await client.messages.create({
    from: process.env.TWILIO_FROM,
    to:   process.env.TWILIO_TO,
    body,
  });

  return res.status(200).json({ ok: true, sent: true, count: followups.length, date: today });
};
