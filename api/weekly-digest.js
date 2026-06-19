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
    console.error(`[weekly-digest] kvCmd failed cmd=${parts[0]} err=${err.message}`);
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
  console.log(`[weekly-digest] invoked method=${req.method} at=${new Date().toISOString()}`);

  // IST date
  const nowUtc  = new Date();
  const istMs   = nowUtc.getTime() + 5.5 * 60 * 60 * 1000;
  const istDate = new Date(istMs);
  const istDay  = istDate.toISOString().slice(0, 10); // YYYY-MM-DD (IST)
  const weekLabel = istDate.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  // A manual trigger supplies the digest in the POST body; the cron does not.
  const isManual = req.method === 'POST' && req.body && req.body.digest;
  let digest = null;

  if (isManual) {
    digest = req.body.digest;
  } else {
    // Cron trigger — read stored digest snapshot from Upstash Redis
    const url   = normalizeUpstashUrl(process.env.UPSTASH_REDIS_REST_URL);
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      console.error('[weekly-digest] Upstash env vars not configured or URL invalid', {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL, urlValid: !!url, hasToken: !!token,
      });
      return res.status(500).json({ error: 'Upstash env vars not configured or URL is not a valid absolute https URL' });
    }
    const target = `${url}/get/pipeline_digest`;
    try {
      console.log(`[weekly-digest] reading snapshot ← ${target}`);
      const kvRes  = await fetch(target, { headers: { Authorization: `Bearer ${token}` } });
      const text   = await kvRes.text();
      let kvJson;
      try { kvJson = JSON.parse(text); }
      catch { throw new Error(`Upstash returned non-JSON (status ${kvRes.status}): ${text.slice(0, 200)}`); }
      digest = kvJson.result ? JSON.parse(kvJson.result) : null;
    } catch (err) {
      console.error(`[weekly-digest] failed to read digest url=${target} err=${err.name}: ${err.message}`);
      return res.status(502).json({ error: 'Failed to read digest from Upstash', detail: err.message });
    }
  }

  console.log(`[weekly-digest] trigger=${isManual ? 'manual' : 'cron'} day=${istDay} hasDigest=${!!digest}`);

  if (!digest) {
    return res.status(200).json({
      ok: true, sent: false,
      reason: 'No digest data available — open the dashboard (auto-syncs) or click "Sync Data for Weekly Cron".',
    });
  }
  if (digest.digestEnabled === false) {
    return res.status(200).json({ ok: true, sent: false, reason: 'Weekly digest is disabled' });
  }

  // ── Idempotency (cron path only): don't double-send for the same week ──
  const guardKey = `digest_sent:${istDay}`;
  if (!isManual) {
    const claim = await kvCmd(['set', guardKey, '1', 'NX', 'EX', '648000']); // ~7.5 days
    if (claim && claim.result !== 'OK') {
      console.log(`[weekly-digest] idempotent skip — already sent for ${istDay}`);
      return res.status(200).json({ ok: true, sent: false, reason: 'Already sent for this week (idempotent)' });
    }
  }

  // ── Build the message ──────────────────────────────────────────────
  const pipeline  = digest.pipeline  || [];
  const investors = digest.investors || 0;
  const startups  = digest.startups  || 0;
  const partners  = digest.partners  || 0;

  const stageMap = {};
  pipeline.forEach(deal => {
    const s = deal.stage || 'Unknown';
    stageMap[s] = (stageMap[s] || 0) + 1;
  });
  const hotDeals = pipeline.filter(d => d.hot);

  const lines = [
    `📊 *Log7 Capital — Weekly Pipeline Digest*`,
    `_Week of ${weekLabel}_`,
    '',
    `*Pipeline: ${pipeline.length} active deal${pipeline.length !== 1 ? 's' : ''}*`,
  ];
  const stages = Object.entries(stageMap).sort((a, b) => b[1] - a[1]);
  stages.forEach(([s, n]) => lines.push(`  • ${s}: ${n}`));
  if (hotDeals.length) {
    lines.push('', `*🔥 Hot Deals (${hotDeals.length}):*`);
    hotDeals.slice(0, 5).forEach(d => {
      const name = [d.investor, d.startup].filter(Boolean).join(' ↔ ');
      lines.push(`  • ${name}${d.stage ? ` (${d.stage})` : ''}`);
    });
  }
  lines.push('', `*Network:* ${investors} Investors | ${startups} Startups | ${partners} Partners`);
  if (digest.note) lines.push('', `_${digest.note}_`);
  lines.push('', `_Sent by Log7 Dashboard · ${weekLabel}_`);
  const body = lines.join('\n');

  // Structured single-line variables for an approved WhatsApp template.
  // Template body (6 vars) — see TWILIO_CONTENT_SID_DIGEST docs:
  //   {{1}} week label · {{2}} active count · {{3}} stage breakdown
  //   {{4}} hot deals · {{5}} network counts · {{6}} note
  const digestVars = {
    1: tv(weekLabel),
    2: tv(pipeline.length),
    3: tv(stages.length ? stages.map(([s, n]) => `${s}: ${n}`).join(' · ') : '—'),
    4: tv(hotDeals.length
          ? hotDeals.slice(0, 5).map(d => {
              const name = [d.investor, d.startup].filter(Boolean).join(' ↔ ');
              return `${name}${d.stage ? ` (${d.stage})` : ''}`;
            }).join('; ')
          : 'none'),
    5: tv(`${investors} investors · ${startups} startups · ${partners} partners`),
    6: tv(digest.note || '—'),
  };

  // ── Twilio config check ────────────────────────────────────────────
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const to   = process.env.TWILIO_TO;
  if (!sid || !auth || !from || !to) {
    if (!isManual) await kvCmd(['del', guardKey]); // release idempotency claim
    console.error('[weekly-digest] Twilio env vars not configured');
    return res.status(500).json({ error: 'Twilio env vars not configured', sent: false });
  }

  // ── Send (template if configured, else free-form body) ─────────────
  // Outside the 24h WhatsApp session window, providers require an APPROVED
  // template. Set TWILIO_CONTENT_SID_DIGEST to a Twilio Content template that
  // takes the 6 structured variables in `digestVars` (see comment above) to
  // send reliably from the unattended cron. Falls back to free-form in-window.
  const contentSid = process.env.TWILIO_CONTENT_SID_DIGEST;
  const client = twilio(sid, auth);
  const msg = contentSid
    ? { from, to, contentSid, contentVariables: JSON.stringify(digestVars) }
    : { from, to, body };

  try {
    const result = await client.messages.create(msg);
    console.log(`[weekly-digest] sent sid=${result.sid} status=${result.status} to=${to}`);
    return res.status(200).json({
      ok: true, sent: true, deals: pipeline.length, date: istDay,
      messageSid: result.sid, status: result.status,
      mode: contentSid ? 'template' : 'freeform',
    });
  } catch (err) {
    if (!isManual) await kvCmd(['del', guardKey]); // allow a retry on failure
    console.error(`[weekly-digest] Twilio send failed code=${err.code} status=${err.status} msg=${err.message}`);
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
    case 63016: return 'Outside the 24h WhatsApp window — set TWILIO_CONTENT_SID_DIGEST to an APPROVED template.';
    case 63015: return 'WhatsApp template/policy issue — verify the template is approved.';
    case 63007: return 'WhatsApp sender (TWILIO_FROM) not found/active, or sandbox not joined.';
    case 63003: return 'Recipient (TWILIO_TO) cannot receive WhatsApp / not opted in.';
    case 21211: return 'Invalid TWILIO_TO — must be E.164 with whatsapp: prefix, e.g. whatsapp:+9172...';
    case 21608: return 'Twilio trial: recipient number not verified, or sandbox not joined in last 72h.';
    case 20003: return 'Authentication failed — check TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN.';
    default:    return 'See moreInfo URL for details.';
  }
}
