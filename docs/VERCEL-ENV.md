# Vercel environment

Server-only variables. Never prefix these with NEXT_PUBLIC_.

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/attention_firewall"
AUTH_FLOW_SECRET="replace-with-a-32-plus-character-random-secret"
WEBAUTHN_RP_ID="example.com"
WEBAUTHN_ORIGIN="https://example.com"
TELEMETRY_INGEST_ENABLED="false"

## GitHub deployment secrets

Configure repository secrets:
- VERCEL_TOKEN
- VERCEL_ORG_ID
- VERCEL_PROJECT_ID

Never commit their values.

## Preview safety

Never connect a preview deployment to production database credentials. Use a separate preview database or keep account/cloud features disabled.

The local-first dashboard remains usable without server variables.
