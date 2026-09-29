# Threat model

## Assets

- User identity
- Local attention history
- User rules and commitments
- Subscription entitlement
- Intervention profile

## Threats

### Cloud compromise

Mitigation: behavioral history is not stored centrally.

### Device compromise

Mitigation: local database encryption where supported, OS secure storage for keys, minimal retention.

### Malicious extension update

Mitigation: signed releases, minimal permissions, code review, reproducible build targets where practical.

### Insider access

Mitigation: backend operators cannot query a behavioral timeline because it does not exist server-side.

### Cross-device correlation

Mitigation: device identifiers are random, scoped, revocable and never derived from advertising identifiers.

### Re-identification

Mitigation: aggregate opt-in analytics; avoid fine-grained timestamps and rare combinations in telemetry.

### Function creep

Mitigation: data inventory and privacy review required for new collection fields.

## Browser permission principle

Request only the minimum extension permissions needed for the current feature. Do not request broad history access merely because it would be convenient.

## Security rule

If a feature cannot be implemented without centralizing sensitive behavioral data, treat that as an architecture exception requiring explicit review.
