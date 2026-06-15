#!/usr/bin/env bash
# setup-twilio-templates.sh
#
# Creates both Twilio WhatsApp Content Templates and submits them for approval.
# Run locally with your credentials exported — do NOT paste tokens into chat.
#
#   export TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
#   export TWILIO_AUTH_TOKEN=your_auth_token
#   bash scripts/setup-twilio-templates.sh
#
# Requires: curl, jq

set -euo pipefail

# ── Guard: credentials must be in env, never in args ──────────────────────────
if [[ -z "${TWILIO_ACCOUNT_SID:-}" || -z "${TWILIO_AUTH_TOKEN:-}" ]]; then
  echo "Error: TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in your environment." >&2
  echo "  export TWILIO_ACCOUNT_SID=ACxxxxxxxx" >&2
  echo "  export TWILIO_AUTH_TOKEN=your_auth_token" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install it:" >&2
  echo "  macOS:  brew install jq" >&2
  echo "  Ubuntu: sudo apt install jq" >&2
  exit 1
fi

AUTH="${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"
CONTENT_API="https://content.twilio.com/v1/Content"

echo ""
echo "==================================================================="
echo " Log7 Capital — Twilio WhatsApp Template Setup"
echo "==================================================================="

# ── 1. Create the weekly digest template ──────────────────────────────────────
echo ""
echo "Step 1/4 — Creating weekly digest template..."

DIGEST_BODY='📊 Log7 Capital — Weekly Pipeline Digest\nWeek of {{1}}\n\nPipeline: {{2}} active deals\nStages: {{3}}\nHot deals: {{4}}\nNetwork: {{5}}\nNote: {{6}}\n\n— sent by Log7 Dashboard'

DIGEST_PAYLOAD=$(jq -n \
  --arg body "$DIGEST_BODY" \
  '{
    friendly_name: "log7_weekly_digest",
    language: "en",
    variables: {
      "1": "14 Jun 2026",
      "2": "5",
      "3": "Seed: 3 · Series A: 2",
      "4": "Acme ↔ Foo (Seed); Bar ↔ Baz",
      "5": "12 investors · 8 startups · 4 partners",
      "6": "Push hard on Acme"
    },
    types: {
      "twilio/text": { body: $body }
    }
  }')

DIGEST_RESP=$(curl -sS -X POST "$CONTENT_API" \
  -u "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$DIGEST_PAYLOAD")

DIGEST_SID=$(echo "$DIGEST_RESP" | jq -r '.sid // empty')

if [[ -z "$DIGEST_SID" || "$DIGEST_SID" == "null" ]]; then
  echo "  Error creating digest template:" >&2
  echo "$DIGEST_RESP" | jq . >&2
  exit 1
fi
echo "  Created: $DIGEST_SID"

# ── 2. Submit digest template for WhatsApp approval ───────────────────────────
echo "Step 2/4 — Submitting digest template for WhatsApp Utility approval..."

APPROVAL_RESP=$(curl -sS -X POST \
  "${CONTENT_API}/${DIGEST_SID}/ApprovalRequests/whatsapp" \
  -u "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"name":"log7_weekly_digest","category":"UTILITY"}')

APPROVAL_STATUS=$(echo "$APPROVAL_RESP" | jq -r '.status // .approval_status // "submitted"')
echo "  Submitted — status: ${APPROVAL_STATUS}"

# ── 3. Create the daily follow-up template ────────────────────────────────────
echo ""
echo "Step 3/4 — Creating daily follow-up template..."

FOLLOWUP_BODY='📋 Log7 Capital — Follow-ups for {{1}}\n\nDue today ({{2}}):\n{{3}}\n\n— sent by Log7 Dashboard'

FOLLOWUP_PAYLOAD=$(jq -n \
  --arg body "$FOLLOWUP_BODY" \
  '{
    friendly_name: "log7_followups_daily",
    language: "en",
    variables: {
      "1": "14 Jun 2026",
      "2": "3",
      "3": "Investors: Acme (intro call), Beta · Startups: Foo"
    },
    types: {
      "twilio/text": { body: $body }
    }
  }')

FOLLOWUP_RESP=$(curl -sS -X POST "$CONTENT_API" \
  -u "$AUTH" \
  -H "Content-Type: application/json" \
  -d "$FOLLOWUP_PAYLOAD")

FOLLOWUP_SID=$(echo "$FOLLOWUP_RESP" | jq -r '.sid // empty')

if [[ -z "$FOLLOWUP_SID" || "$FOLLOWUP_SID" == "null" ]]; then
  echo "  Error creating follow-up template:" >&2
  echo "$FOLLOWUP_RESP" | jq . >&2
  exit 1
fi
echo "  Created: $FOLLOWUP_SID"

# ── 4. Submit follow-up template for WhatsApp approval ────────────────────────
echo "Step 4/4 — Submitting follow-up template for WhatsApp Utility approval..."

APPROVAL_RESP2=$(curl -sS -X POST \
  "${CONTENT_API}/${FOLLOWUP_SID}/ApprovalRequests/whatsapp" \
  -u "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{"name":"log7_followups_daily","category":"UTILITY"}')

APPROVAL_STATUS2=$(echo "$APPROVAL_RESP2" | jq -r '.status // .approval_status // "submitted"')
echo "  Submitted — status: ${APPROVAL_STATUS2}"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "==================================================================="
echo " Done! Both templates submitted for WhatsApp approval."
echo " Approval typically takes a few minutes to a few hours."
echo "==================================================================="
echo ""
echo " Content SIDs:"
echo "   TWILIO_CONTENT_SID_DIGEST   = $DIGEST_SID"
echo "   TWILIO_CONTENT_SID_FOLLOWUP = $FOLLOWUP_SID"
echo ""
echo " Next: wire the SIDs into Vercel (run these locally):"
echo ""
echo "   vercel env add TWILIO_CONTENT_SID_DIGEST production"
echo "   # paste: $DIGEST_SID"
echo ""
echo "   vercel env add TWILIO_CONTENT_SID_FOLLOWUP production"
echo "   # paste: $FOLLOWUP_SID"
echo ""
echo "   vercel --prod"
echo "   # redeploy so the new env vars take effect"
echo ""
echo " Check approval status in Twilio Console:"
echo "   Messaging → Content Template Builder → your template → Status"
echo ""
echo " Once approved, the crons will use template mode automatically:"
echo "   Daily follow-ups  — 07:00 IST every day"
echo "   Weekly digest     — 09:00 IST every Monday"
echo "==================================================================="
