# Privacy-by-design specification

This document is an engineering specification, not legal advice.

## Privacy rules

1. Collect the minimum data required for a declared product function.
2. Prefer local processing over server processing.
3. Prefer derived features over raw events.
4. Prefer aggregate counts over event histories.
5. Keep retention short.
6. Make optional telemetry opt-in.
7. Give the user local export and deletion controls.
8. Never sell behavioral data.
9. Never use behavioral data for advertising profiles.
10. Never silently change a local-only feature into a cloud feature.

## Data subject controls

The product should provide:

- access/export of locally stored data
- deletion of local history
- reset of learned intervention profile
- disable telemetry
- revoke platform permissions
- delete account
- clear all cloud telemetry associated with the account where technically possible

Kenya's ODPC identifies rights including being informed, access, objection, correction and deletion, and describes principles including purpose limitation, necessity and retention limitation. The product architecture is intentionally designed around these principles.

## Privacy modes

### Local-only

No account. No cloud behavioral telemetry.

### Account

Account data plus subscription/device metadata. Behavioral state remains local.

### Diagnostics opt-in

Coarse technical events only, such as crash class, app version and intervention-engine version.

### Research opt-in

Only aggregated, purpose-specific measurements. No raw behavioral event stream.

## Retention

Raw platform events: ephemeral; discard after feature extraction.

Local session features: configurable, default 30 days.

Local intervention outcomes: default 90 days.

Cloud diagnostics: shortest operational period consistent with reliability needs.

No indefinite behavioral retention.

## Sensitive data policy

The system does not intentionally infer health, religion, political views, sexuality, financial status, or other sensitive attributes. Attention-state classification is strictly operational: focused, intentional, drifting, compulsive-risk, recovery.

The product must not market these operational states as medical diagnoses.
