# Vercel deployment

## Project

Create one Vercel project for the web surface from this repository.

This repository is a pnpm monorepo. Vercel's current monorepo guidance supports pnpm workspaces and requires internal dependencies to be declared in package manifests. citeturn126028search0turn126028search3

## Settings

Framework: Next.js

Install command:
```
pnpm install --no-frozen-lockfile
```

Build command:
```
pnpm --filter @attention-firewall/web... build
```

Development command:
```
pnpm --filter @attention-firewall/web dev
```

The project should build from the repository root so the web app can access workspace packages.

## Required environment variables for production account features

- DATABASE_URL
- AUTH_FLOW_SECRET
- WEBAUTHN_RP_ID
- WEBAUTHN_ORIGIN

Without those variables, the local-first web experience still works, while account/passkey/cloud-sync endpoints fail closed with service-not-configured.

## Database

Apply:
```
services/api/db/schema.sql
```

Do not point a preview deployment at production credentials.

## Privacy

The Vercel deployment does not make the local behavioral protection loop depend on the cloud.

The cloud data model is limited to identity, device/session security, entitlements and opaque encrypted settings. Behavioral history is not part of the API schema.

## Preview

Vercel supports importing a project directly from a GitHub repository through the New Project flow. For monorepos, select the directory/project that should be deployed and configure the build settings before deployment. citeturn126028search0
