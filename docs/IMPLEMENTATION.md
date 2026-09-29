# Implementation blueprint

## Current repository

- Attention Drift scoring engine
- Adaptive friction ladder
- Privacy telemetry contract
- Local storage primitive
- Browser extension shell
- Privacy-first web dashboard
- Privacy, data, threat and IP specifications

## Build order

### 1. Local core
The attention engine remains platform-independent and deterministic. Inputs are coarse features, not raw content.

### 2. Browser
The extension observes only the signals necessary to detect a local session pattern. It does not store a browsing history.

### 3. Mobile
Android and iOS adapters translate OS-level usage APIs into the same coarse feature contract.

### 4. Local persistence
Use an encrypted local database on mobile where practical. Keep browser state on-device with strict schema versioning.

### 5. Cloud
Do not build a behavioral database. The first cloud API should support only account identity, subscription entitlement, device registration/revocation, and coarse optional diagnostics.

### 6. Research
Research exports must be explicit opt-in. The device aggregates measurements before transmission.

## Acceptance criteria

A release is privacy-compliant at the engineering level only if:

- raw URLs never reach the API;
- page content never reaches the API;
- screenshots never reach the API;
- raw usage event timelines never reach the API;
- telemetry validation rejects forbidden fields;
- local-only mode works without an account;
- turning telemetry off stops telemetry;
- local data can be exported and deleted;
- every new data field has a purpose and retention entry;
- the intervention engine can run with no network connection.

## Product metrics

The primary metric should not be total screen time alone.

Track locally:

- intentional session completion rate
- drift episodes
- intervention acceptance rate
- intervention escalation rate
- recovery completion rate
- attention recovered

Cloud analytics, if enabled, should receive only aggregated/coarse versions of these metrics.
