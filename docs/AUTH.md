# Authentication and account security

Authentication is not required for local-only mode.

## Preferred production model

Use phishing-resistant passkeys/WebAuthn where supported.

Fallback account flows should use:
- strong password hashing with a modern password-hashing function;
- MFA;
- rate limiting;
- breached-password screening;
- session rotation;
- secure, HttpOnly, SameSite cookies;
- CSRF protection;
- device/session revocation.

## Session model

Access sessions should be short-lived. Refresh credentials must be rotated and invalidated on reuse or explicit revocation.

Do not store long-lived auth tokens in localStorage.

## Device model

Each registered device receives a random identifier unrelated to advertising identifiers.

A user must be able to:
- list devices;
- revoke a device;
- revoke all sessions;
- reset local encryption/profile state.

The server must not require behavioral history to authenticate the user.

## Recovery

Account recovery must not expose attention history. Password/passkey recovery and device recovery should be independently revocable.

## Administrative access

Production admin access requires:
- MFA/security keys;
- least privilege;
- separate admin identities;
- just-in-time elevation where available;
- audit logging;
- no direct access to local behavioral data because it is not stored centrally.
