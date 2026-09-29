# Authentication architecture

Attention Firewall uses passwordless authentication as the production target.

## Passkeys

The WebAuthn ceremony is:
1. create registration options;
2. authenticator creates credential;
3. verify registration response;
4. store credential public key + counter;
5. create authentication options;
6. authenticator signs assertion;
7. verify assertion;
8. update signature counter.

The WebAuthn user ID is a random non-PII identifier and is distinct from the user's email/username.

User verification is required for the production authentication flow.

## Server-side storage

A passkey record stores only:
- credential ID;
- public key;
- WebAuthn user ID;
- signature counter;
- transport hints;
- device-type/back-up status.

Private key material never reaches the server.

## Session security

After successful WebAuthn verification:
- issue a short-lived secure session;
- use Secure + HttpOnly + SameSite cookie attributes;
- rotate session identifiers after authentication;
- revoke on logout/device revocation;
- do not store session secrets in localStorage.

## Challenge lifecycle

Registration and authentication challenges are short-lived and single-use.

Never reuse a challenge.

## Recovery

Account recovery must not decrypt or expose local behavioral history. Recovery is an account/security process only.

## Device security

Every registered device has a random revocable identifier. Device management is separate from behavioral data.

## Library

The current implementation targets SimpleWebAuthn server/browser 14.x APIs. The current server documentation recommends the two-step options/verification flow and a server-side credential record for subsequent assertions. citeturn126028search0turn223559search2

## Production requirements

- trusted origin and RP ID configuration;
- HTTPS;
- challenge store;
- passkey store;
- session store;
- rate limits;
- abuse protection;
- MFA/security keys for administrators;
- device revocation;
- audit events without behavioral data.
