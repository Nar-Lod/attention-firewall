# Cloud contracts

## POST /api/devices/register

Authenticated request.

Input:
- platform
- appVersion
- devicePublicKey

Output:
- deviceId
- registeredAt

No attention or browsing fields.

## POST /api/devices/revoke

Authenticated request.

Input:
- deviceId

Effect:
- revoke device credentials.

## GET /api/entitlements

Authenticated request.

Output:
- plan
- status
- expiresAt

## DELETE /api/account

Authenticated, re-authorized request.

Effect:
- revoke devices;
- invalidate sessions;
- delete cloud account and entitlement metadata according to retention policy.

Behavioral data is not part of any endpoint.
