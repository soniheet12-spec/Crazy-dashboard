# WhatsApp Templates & Cron Notifications

This dashboard sends two WhatsApp messages via Twilio:

| Job | Endpoint | Schedule (cron) | IST time |
|-----|----------|-----------------|----------|
| Daily follow-up reminder | `/api/send-followup-reminder` | `30 12 * * *` (12:30 UTC) | **18:00 IST daily** |
| Weekly pipeline digest | `/api/weekly-digest` | `30 3 * * 1` (03:30 UTC Mon) | **09:00 IST Monday** |

Cron jobs run on **production only** and are invoked internally by Vercel (so
Deployment Protection does not block them). The dashboard pushes read-only
snapshots of follow-ups (`/api/save-followups`) and the pipeline digest
(`/api/save-digest`) to Upstash on load and whenever follow-ups change, so the
crons always have fresh data.

## How sending works

Outside the WhatsApp **24-hour session window**, Meta requires an **approved
template**. Each endpoint therefore sends in one of two modes:

- **Template mode** (recommended for unattended cron): set the matching
  `TWILIO_CONTENT_SID_*` env var → the endpoint sends the approved template with
  structured variables.
- **Free-form fallback**: if the env var is absent, it sends a multi-line text
  body. This only works inside the 24h window or in the Twilio Sandbox
  (sandbox requires re-joining every 72h).

### Environment variables (Vercel → Settings → Environment Variables → Production)

| Variable | Purpose |
|----------|---------|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `TWILIO_FROM` | Sender, e.g. `whatsapp:+14155238886` (sandbox) or your WABA number |
| `TWILIO_TO` | Recipient, **`whatsapp:+<E.164>`** (e.g. `whatsapp:+917208554302`) |
| `TWILIO_CONTENT_SID_DIGEST` | Approved digest template SID (`HX…`) |
| `TWILIO_CONTENT_SID_FOLLOWUP` | Approved follow-up template SID (`HX…`) |
| `FOLLOWUP_SEND_WHEN_EMPTY` | `true` to send "no follow-ups today"; default skips |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | KV store for snapshots + idempotency |

> Env-var changes take effect on the **next deployment** — redeploy after setting them.

---

## Template 1 — Weekly digest  →  `TWILIO_CONTENT_SID_DIGEST`

**Category:** Utility · **Language:** English (`en`) · **Type:** Text

```
📊 Log7 Capital — Weekly Pipeline Digest
Week of {{1}}

Pipeline: {{2}} active deals
Stages: {{3}}
Hot deals: {{4}}
Network: {{5}}
Note: {{6}}

— sent by Log7 Dashboard
```

| Var | Meaning | Sample |
|-----|---------|--------|
| `{{1}}` | Week label | `14 Jun 2026` |
| `{{2}}` | Active deal count | `5` |
| `{{3}}` | Stage breakdown | `Seed: 3 · Series A: 2` |
| `{{4}}` | Hot deals | `Acme ↔ Foo (Seed); Bar ↔ Baz` |
| `{{5}}` | Network counts | `12 investors · 8 startups · 4 partners` |
| `{{6}}` | Note | `Push hard on Acme` |

## Template 2 — Daily follow-ups  →  `TWILIO_CONTENT_SID_FOLLOWUP`

**Category:** Utility · **Language:** English (`en`) · **Type:** Text

```
📋 Log7 Capital — Follow-ups for {{1}}

Due today ({{2}}):
{{3}}

— sent by Log7 Dashboard
```

| Var | Meaning | Sample |
|-----|---------|--------|
| `{{1}}` | Date | `14 Jun 2026` |
| `{{2}}` | Count | `3` |
| `{{3}}` | Flattened list | `Investors: Acme (intro call), Beta · Startups: Foo` |

> The code flattens every variable to a single line — WhatsApp forbids
> newlines/tabs inside variables. The fixed scaffolding (labels, line breaks,
> emojis) lives in the approved template body above.

---

## Create the templates

### Option A — Twilio Console (no CLI)
1. **Messaging → Content Template Builder → Create new**.
2. Type **Text**, language **English**, paste the body, add the sample values.
3. Save, then **Submit for WhatsApp approval** with category **Utility**.
4. After approval, copy the **Content SID** (`HX…`).

### Option B — Twilio API (copy-paste; token stays on your machine)
Run locally with your credentials exported (never paste the auth token into chat):

```bash
export TWILIO_ACCOUNT_SID=ACxxxxxxxx
export TWILIO_AUTH_TOKEN=your_auth_token

# 1) Create the weekly-digest content
curl -X POST https://content.twilio.com/v1/Content \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "log7_weekly_digest",
    "language": "en",
    "variables": {"1":"14 Jun 2026","2":"5","3":"Seed: 3 · Series A: 2","4":"Acme ↔ Foo (Seed); Bar ↔ Baz","5":"12 investors · 8 startups · 4 partners","6":"Push hard on Acme"},
    "types": { "twilio/text": { "body": "📊 Log7 Capital — Weekly Pipeline Digest\nWeek of {{1}}\n\nPipeline: {{2}} active deals\nStages: {{3}}\nHot deals: {{4}}\nNetwork: {{5}}\nNote: {{6}}\n\n— sent by Log7 Dashboard" } }
  }'
# → note the returned "sid": "HX..."  (this is TWILIO_CONTENT_SID_DIGEST)

# 2) Submit it for WhatsApp approval (Utility)
curl -X POST "https://content.twilio.com/v1/Content/HX_DIGEST_SID/ApprovalRequests/whatsapp" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"log7_weekly_digest","category":"UTILITY"}'

# 3) Create the daily follow-up content
curl -X POST https://content.twilio.com/v1/Content \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "friendly_name": "log7_followups_daily",
    "language": "en",
    "variables": {"1":"14 Jun 2026","2":"3","3":"Investors: Acme (intro call), Beta · Startups: Foo"},
    "types": { "twilio/text": { "body": "📋 Log7 Capital — Follow-ups for {{1}}\n\nDue today ({{2}}):\n{{3}}\n\n— sent by Log7 Dashboard" } }
  }'
# → note the returned "sid": "HX..."  (this is TWILIO_CONTENT_SID_FOLLOWUP)

# 4) Submit it for WhatsApp approval (Utility)
curl -X POST "https://content.twilio.com/v1/Content/HX_FOLLOWUP_SID/ApprovalRequests/whatsapp" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"log7_followups_daily","category":"UTILITY"}'
```

## Wire the SIDs into Vercel

```bash
# Vercel CLI (run locally; uses your Vercel login)
vercel env add TWILIO_CONTENT_SID_DIGEST production     # paste HX… for the digest
vercel env add TWILIO_CONTENT_SID_FOLLOWUP production   # paste HX… for the follow-ups
vercel --prod                                            # redeploy so the vars take effect
```
…or set them in **Vercel → Project → Settings → Environment Variables (Production)** and redeploy.

## Test

- **In-window / sandbox:** use the dashboard buttons **"Send Digest Now"** and
  **"📲 Send WhatsApp Reminder Now"** — they surface the real Twilio error on failure.
- **Scheduled:** follow-ups at **18:00 IST** (6:00 PM), digest **Mon 09:00 IST**.

## Twilio error codes you may see

| Code | Meaning / fix |
|------|---------------|
| `63016` | Free-form outside 24h window → set `TWILIO_CONTENT_SID_*` to an **approved** template |
| `63015` | Template/policy issue → confirm the template is approved |
| `63007` | `TWILIO_FROM` sender not found/active, or sandbox not joined |
| `63003` | Recipient can't receive WhatsApp / not opted in |
| `21211` | Invalid `TWILIO_TO` → must be `whatsapp:+<E.164>` |
| `21608` | Trial: recipient not verified, or sandbox not re-joined in 72h |
| `20003` | Auth failed → check `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` |
