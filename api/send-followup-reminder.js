const twilio = require('twilio');

// ── Upstash REST helper (path-style command) ───────────────────────
async function kvCmd(parts) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const path = parts.map(encodeURIComponent).join('/');
  const r = await fetch(`${url}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.json(); // { result: ... }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Today's date in IST (UTC+5:30)
  const nowUtc  = new Date();
  const istMs   = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const today   = istDate.toISOString().slice(0, 10); // YYYY-MM-DD (IST)

  // A manual trigger supplies follow-ups in the POST body; the cron does not.
  const isManual = req.method === 'POST' && req.body && Array.isArray(req.body.followups);
  let followups = [];

  if (isManual) {
    followups = req.body.followups;
  } else {
    // Cron job — read the snapshot the dashboard pushes to Upstash Redis
    const url   = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      console.error('[followup-reminder] Upstash env vars not configured');
      return res.status(500).json({ error: 'Upstash env vars not configured' });
    }
    const kvRes  = await fetch(`${url}/get/network_followups`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const kvJson = await kvRes.json();
    const all    = kvJson.result ? JSON.parse(kvJson.result) : [];
    // Due today (IST), named, and not already marked done.
    followups = all.filter(f =>
      f && f.name &&
      String(f.followUpDate || '').slice(0, 10) === today &&
      f.status !== 'done' && f.followUpDone !== true
    );
  }

  console.log(`[followup-reminder] trigger=${isManual ? 'manual' : 'cron'} day=${today} due=${followups.length}`);

  // ── Idempotency (cron path only): one send per IST day ─────────────
  const guardKey = `followup_sent:${today}`;
  if (!isManual) {
    const claim = await kvCmd(['set', guardKey, '1', 'NX', 'EX', '172800']); // 2 days
    if (claim && claim.result !== 'OK') {
      console.log(`[followup-reminder] idempotent skip — already sent for ${today}`);
      return res.status(200).json({ ok: true, sent: false, reason: 'Already sent today (idempotent)' });
    }
  }

  // ── Nothing due: skip by default; opt in to a "nothing today" ping ──
  const sendWhenEmpty = /^(1|true|yes)$/i.test(process.env.FOLLOWUP_SEND_WHEN_EMPTY || '');
  const dateLabel = istDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  let body;
  if (!followups.length) {
    if (!sendWhenEmpty) {
      return res.status(200).json({ ok: true, sent: false, reason: 'No follow-ups due today' });
    }
    body = `📋 *Log7 Capital — Follow-ups for ${dateLabel}*\n\n✅ No follow-ups due today.`;
  } else {
    // Group by tab
    const groups = { investors: [], startups: [], partnerships: [] };
    followups.forEach(f => {
      const tab = f.tab in groups ? f.tab : 'partnerships';
      groups[tab].push(f);
    });
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
    body = lines.join('\n');
  }

  // ── Twilio config check ────────────────────────────────────────────
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const to   = process.env.TWILIO_TO;
  if (!sid || !auth || !from || !to) {
    if (!isManual) await kvCmd(['del', guardKey]); // release idempotency claim
    console.error('[followup-reminder] Twilio env vars not configured');
    return res.status(500).json({ error: 'Twilio env vars not configured', sent: false });
  }

  // ── Send (template if configured, else free-form body) ─────────────
  // Outside the 24h WhatsApp window an APPROVED template is required. Set
  // TWILIO_CONTENT_SID_FOLLOWUP to a Twilio Content template with a single
  // {{1}} body variable to send reliably from the unattended cron.
  const contentSid = process.env.TWILIO_CONTENT_SID_FOLLOWUP;
  const client = twilio(sid, auth);
  const msg = contentSid
    ? { from, to, contentSid, contentVariables: JSON.stringify({ 1: body }) }
    : { from, to, body };

  try {
    const result = await client.messages.create(msg);
    console.log(`[followup-reminder] sent sid=${result.sid} status=${result.status} count=${followups.length}`);
    return res.status(200).json({
      ok: true, sent: true, count: followups.length, date: today,
      messageSid: result.sid, status: result.status,
      mode: contentSid ? 'template' : 'freeform',
    });
  } catch (err) {
    if (!isManual) await kvCmd(['del', guardKey]); // allow a retry on failure
    console.error(`[followup-reminder] Twilio send failed code=${err.code} status=${err.status} msg=${err.message}`);
    return res.status(502).json({
      ok: false, sent: false,
      error: err.message, code: err.code, status: err.status,
      moreInfo: err.moreInfo,
      hint: twilioHint(err.code),
    });
  }
};

// Map common Twilio/WhatsApp error codes to actionable hints.
function twilioHint(code) {
  switch (code) {
    case 63016: return 'Outside the 24h WhatsApp window — set TWILIO_CONTENT_SID_FOLLOWUP to an APPROVED template.';
    case 63015: return 'WhatsApp template/policy issue — verify the template is approved.';
    case 63007: return 'WhatsApp sender (TWILIO_FROM) not found/active, or sandbox not joined.';
    case 63003: return 'Recipient (TWILIO_TO) cannot receive WhatsApp / not opted in.';
    case 21211: return 'Invalid TWILIO_TO — must be E.164 with whatsapp: prefix, e.g. whatsapp:+9172...';
    case 21608: return 'Twilio trial: recipient number not verified, or sandbox not joined in last 72h.';
    case 20003: return 'Authentication failed — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.';
    default:    return 'See moreInfo URL for details.';
  }
}
