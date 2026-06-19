const twilio = require('twilio');

// Ensure the Upstash REST URL is an absolute https URL with no trailing slash.
// A scheme-less host makes fetch() throw "TypeError: Failed to parse URL".
function normalizeUpstashUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let u = raw.trim().replace(/\/+$/, '');
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try { new URL(u); } catch { return null; }
  return u;
}

// ── Upstash REST helper (path-style command) ───────────────────────
async function kvCmd(parts) {
  const url   = normalizeUpstashUrl(process.env.UPSTASH_REDIS_REST_URL);
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const path = parts.map(encodeURIComponent).join('/');
  try {
    const r = await fetch(`${url}/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return r.json(); // { result: ... }
  } catch (err) {
    console.error(`[followup-reminder] kvCmd failed cmd=${parts[0]} err=${err.message}`);
    return null; // idempotency is best-effort; never crash the handler
  }
}

// Sanitize a value for a WhatsApp template variable. WhatsApp rejects newlines,
// tabs, and runs of >4 spaces inside variables, so flatten to a single line.
function tv(s) {
  const out = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 900);
  return out || '—';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // First line of real work — proves the cron actually invoked the function in
  // Vercel runtime logs, even if a later step throws.
  console.log(`[followup-reminder] invoked method=${req.method} at=${new Date().toISOString()}`);

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
    const url   = normalizeUpstashUrl(process.env.UPSTASH_REDIS_REST_URL);
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      console.error('[followup-reminder] Upstash env vars not configured or URL invalid', {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL, urlValid: !!url, hasToken: !!token,
      });
      return res.status(500).json({ error: 'Upstash env vars not configured or URL is not a valid absolute https URL' });
    }
    const target = `${url}/get/network_followups`;
    let all = [];
    try {
      console.log(`[followup-reminder] reading snapshot ← ${target}`);
      const kvRes  = await fetch(target, { headers: { Authorization: `Bearer ${token}` } });
      const text   = await kvRes.text();
      let kvJson;
      try { kvJson = JSON.parse(text); }
      catch { throw new Error(`Upstash returned non-JSON (status ${kvRes.status}): ${text.slice(0, 200)}`); }
      all = kvJson.result ? JSON.parse(kvJson.result) : [];
    } catch (err) {
      console.error(`[followup-reminder] failed to read follow-ups url=${target} err=${err.name}: ${err.message}`);
      return res.status(502).json({ error: 'Failed to read follow-ups from Upstash', detail: err.message });
    }
    // Due today (IST) OR overdue, named, and not already marked done. Matches the
    // dashboard badge + manual button (date <= today) so overdue follow-ups send.
    followups = all.filter(f =>
      f && f.name &&
      String(f.followUpDate || '').slice(0, 10) <= today &&
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

  let body, listLine;
  if (!followups.length) {
    if (!sendWhenEmpty) {
      return res.status(200).json({ ok: true, sent: false, reason: 'No follow-ups due today' });
    }
    body = `📋 *Log7 Capital — Follow-ups for ${dateLabel}*\n\n✅ No follow-ups due today.`;
    listLine = 'none';
  } else {
    // Group by tab
    const groups = { investors: [], startups: [], partnerships: [] };
    followups.forEach(f => {
      const tab = f.tab in groups ? f.tab : 'partnerships';
      groups[tab].push(f);
    });
    const lines = [`📋 *Log7 Capital — Follow-ups for ${dateLabel}*\n`];
    const flat  = [];
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
      // single-line flattened version for the structured template variable
      flat.push(`${label}: ` + groups[key].map(f => {
        const sn = (f.notes || '').trim().slice(0, 40);
        return f.name + (sn ? ` (${sn})` : '');
      }).join(', '));
    });
    lines.push(`Total: ${followups.length} follow-up${followups.length > 1 ? 's' : ''} today.`);
    body = lines.join('\n');
    listLine = flat.join(' · ');
  }

  // Structured single-line variables for an approved WhatsApp template.
  // Template body (3 vars): {{1}} date · {{2}} count · {{3}} flattened list
  const followupVars = { 1: tv(dateLabel), 2: tv(followups.length), 3: tv(listLine || 'none') };

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
  // TWILIO_CONTENT_SID_FOLLOWUP to a Twilio Content template taking the 3
  // structured variables in `followupVars` to send reliably from the cron.
  // Falls back to free-form body when in-window / sandbox.
  const contentSid = process.env.TWILIO_CONTENT_SID_FOLLOWUP;
  const client = twilio(sid, auth);
  const msg = contentSid
    ? { from, to, contentSid, contentVariables: JSON.stringify(followupVars) }
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
