# API contract

The API is intentionally small.

## Current endpoint

### POST /api/telemetry

Purpose: optional coarse reliability/intervention telemetry.

Requirements:
- explicit telemetry opt-in header;
- schema version 1;
- allowlisted fields only;
- no behavioral-history persistence.

The endpoint rejects fields representing URLs, page content, messages, screenshots, keystrokes, clipboard data, precise location and other prohibited raw data.

## Future endpoints

- POST /api/auth/session
- GET /api/entitlements
- POST /api/devices
- DELETE /api/devices/:id

No endpoint should expose or synchronize a behavioral timeline.

## Authentication

Production endpoints must use authenticated sessions and server-side authorization. Device registration should use random revocable device identifiers rather than advertising identifiers.

## Cloud data model

The intended first cloud model contains:

Account
- id
- auth provider subject
- createdAt

Entitlement
- accountId
- plan
- status
- expiresAt

Device
- id
- accountId
- platform
- appVersion
- createdAt
- revokedAt

No Session table exists by design.
