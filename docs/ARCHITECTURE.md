# Architecture

## Principle

Attention Firewall is local-first.

The device is the source of truth for behavioral state. The cloud is deliberately not a behavioral data warehouse.

## Data flow

1. Platform adapter observes only the minimum platform signals needed to operate.
2. Local event normalizer converts them into coarse behavioral features.
3. Intent engine stores the user's current intention locally.
4. Attention Drift Engine computes state locally.
5. Intervention Engine selects the least intrusive effective intervention.
6. Recovery Engine proposes a locally stored recovery action.
7. Learning Engine updates a local intervention-response profile.
8. Optional telemetry exporter emits only approved coarse events.

## Local components

- Intent Store
- Rules Store
- Local Session Store
- Feature Extractor
- Attention Drift Engine
- Intervention Engine
- Recovery Engine
- Local Analytics
- Consent/Privacy Store

## Cloud components

- Authentication
- Subscription entitlement
- Device authorization
- Product configuration that contains no personal behavioral history
- Optional coarse reliability telemetry
- Explicitly opt-in research telemetry, aggregated before transmission

## Explicitly prohibited server collection

The default system must not upload:

- URLs visited
- page titles
- page contents
- search queries
- messages
- screenshots
- keystrokes
- clipboard contents
- notification contents
- raw app-open timelines
- contact lists
- precise location
- microphone/camera data
- advertising identifiers

## Platform strategy

### Browser

Manifest V3 extension. URL/domain classification should be performed locally. Store only hashes or local rule identifiers where possible.

### Android

Use UsageStatsManager only after explicit user authorization. Convert platform events into coarse local features and discard raw event details after feature extraction.

### iOS

Use Apple's Family Controls and Device Activity frameworks after explicit authorization. Prefer tokenized selections and local state. Do not request non-tokenized activity data unless a feature genuinely requires it.

Apple requires the Family Controls capability and authorization for this class of functionality. See Apple's current Family Controls documentation.

## Server minimization

A user account should be optional for local-only mode.

If an account exists, the server should know only what is necessary for:

- authentication
- subscription entitlement
- device registration/revocation
- security
- service reliability

Behavioral history remains local.
