# Authentication architecture

Attention Firewall targets passkey-first authentication.

The current auth core uses SimpleWebAuthn 14.x. The documented flow is registration options → authenticator → verification, and authentication options → authenticator → verification. Credentials are stored as public-key material plus counters; private key material never reaches the server. citeturn126028search0

## Session security

After successful authentication:
- issue an opaque random session token;
- store only its SHA-256 hash server-side;
- send the raw token only in a Secure, HttpOnly, SameSite=Strict cookie;
- use short-lived sessions;
- support explicit account/device/session revocation;
- never store session tokens in localStorage.

## Challenge security

- challenges are short-lived;
- challenge identifiers are single-purpose;
- consumption must be atomic;
- replayed or expired challenges are rejected;
- failed verification never creates a session.

## Device binding

A session is associated with a random revocable device identifier. Device revocation terminates sessions for that device.

## Behavioral-data boundary

Authentication tables must not contain:
- URLs;
- page content;
- attention scores;
- session behavior timelines;
- browsing history;
- intervention history.

## Recovery

Account recovery restores access to the account only. It does not decrypt or retrieve local attention history.

## Library versions

The current implementation targets SimpleWebAuthn server 14.0.3 and browser 14.0.0. citeturn615026search1turn615026search0
