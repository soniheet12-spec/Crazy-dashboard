const twilio = require('twilio');

module.exports = async function handler(req, res) {
  // Today's date in IST (UTC+5:30)
  const nowUtc = new Date();
  const istMs  = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const today   = istDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Read follow-ups from Upstash Redis
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  const kvRes = await fetch(`${url}/get/network_followups`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const kvJson = await kvRes.json();
  // Upstash wraps the value: { result: "..." }
  const followups = kvJson.result ? JSON.parse(kvJson.result) : [];

  // Keep only entries due today
  const due = followups.filter(f => f.followUpDate === today && f.name);

  if (!due.length) {
    return res.status(200).json({ ok: true, sent: false, reason: 'No follow-ups due today' });
  }

  // Group by tab
  const groups = { investors: [], startups: [], partnerships: [] };
  due.forEach(f => {
    const tab = f.tab in groups ? f.tab : 'partnerships';
    groups[tab].push(f);
  });

  // Format date: "14 May 2026"
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

  lines.push(`Total: ${due.length} follow-up${due.length > 1 ? 's' : ''} today.`);

  const body = lines.join('\n');

  // Send via Twilio WhatsApp
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  await client.messages.create({
    from: process.env.TWILIO_FROM,
    to:   process.env.TWILIO_TO,
    body,
  });

  return res.status(200).json({ ok: true, sent: true, count: due.length, date: today });
};
