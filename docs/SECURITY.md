# Security architecture

Security is a first-class product requirement.

## Security objectives

Protect:
1. identity/account data;
2. local behavioral data;
3. user commitments and rules;
4. subscription entitlement;
5. extension privileges;
6. recovery/export artifacts.

## Local-first security

Detailed attention data is processed and retained locally. The cloud is not the behavioral source of truth.

### Local encryption

- Mobile: use OS secure storage/Keystore/Keychain for encryption keys.
- Browser: ordinary operational state is protected by the browser profile; encrypted export uses AES-GCM with PBKDF2-HMAC-SHA-256.
- Encrypted export uses a 600,000-iteration PBKDF2 work factor for the user passphrase, matching the current OWASP PBKDF2-HMAC-SHA-256 recommendation; performance should still be measured on target devices. citeturn847251search0
- Never put encryption keys in logs, analytics, URLs or source control.

## Authentication and network

- HTTPS only.
- HSTS on the web origin.
- Secure, HttpOnly, SameSite cookies for browser sessions.
- No secrets in URLs.
- Short-lived access sessions.
- Refresh-token rotation and reuse detection.
- Passkeys/WebAuthn should be preferred for production.
- MFA/security keys for maintainers and administrators.
- Rate limiting and account/device revocation.

## Web application

Use OWASP ASVS 5.0 as the web security verification baseline.

Required:
- safe DOM APIs and output encoding;
- CSRF protection where cookie sessions are used;
- authentication throttling;
- authorization on every protected action;
- schema validation;
- parameterized database access;
- dependency and secret scanning;
- security headers;
- safe error handling;
- security logs that exclude behavioral content.

## Browser extension

Manifest V3.
- Minimal permissions.
- No remote executable code.
- Strict extension CSP.
- No eval/new Function/document.write/unsafe innerHTML.
- Content-script messages are untrusted and validated.
- No secrets sent to content scripts.
- No external pages can modify privileged extension state without validation.

## Supply chain

- lockfile committed before production;
- Dependabot/dependency updates;
- CodeQL;
- dependency review;
- secret scanning;
- protected main branch;
- MFA/security keys for maintainers;
- signed/integrity-checked releases where practical.

## Privacy-security boundary

Security logs must not become a covert behavioral database.

Do not log URLs, page titles, search terms, messages, screenshots, raw usage timelines or raw attention features.

## Incident response

Production requires:
- session/device revocation;
- credential rotation;
- breach detection;
- user notification procedure;
- secure backups;
- restore testing;
- emergency dependency patching;
- extension rollback/release controls.

This is an engineering baseline, not legal advice.
