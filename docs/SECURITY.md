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

## Security model

### Local-first

Detailed attention data is stored locally and processed locally. Central compromise must not expose a behavioral history that the server does not possess.

### Encryption

- Mobile local databases: platform-backed encryption plus application-level encryption for especially sensitive records where practical.
- Browser: rely on browser profile/OS protection for ordinary local state; provide encrypted export using Web Crypto.
- Secrets: keep encryption keys or refresh credentials in platform secure storage/keychain, never in application logs or analytics.

### Network

- HTTPS only.
- HSTS on the web origin.
- Secure, HttpOnly, SameSite cookies for web sessions.
- No secrets in URLs.
- Strict request schema validation.
- Short-lived access credentials and refresh-token rotation when accounts are introduced.

### Web application

Apply OWASP ASVS 5.0 controls as the baseline verification framework. The current ASVS is 5.0.0. citeturn734888search9

Required controls include:
- output encoding and safe DOM APIs;
- CSRF protection where cookies are used;
- authentication throttling;
- authorization on every protected server action;
- parameterized database access;
- dependency and secret scanning;
- security headers;
- safe error handling;
- audit logging that excludes behavioral content.

### Browser extension

- Manifest V3.
- No remotely hosted executable code.
- No eval/new Function.
- Minimal permissions.
- Strict extension CSP.
- Content-script messages are treated as untrusted.
- No secrets sent to content scripts.
- No sensitive history sent to web pages.
- No externally connectable origins unless explicitly required.

Chrome's extension security guidance specifically recommends minimal permissions, HTTPS, explicit CSP, avoiding innerHTML/document.write, and validating content-script inputs. citeturn734888search2

### Supply chain

- Pin lockfile versions.
- Automated dependency audit.
- Dependabot/Renovate.
- Secret scanning.
- CodeQL.
- Protected main branch.
- 2FA/security keys for maintainers.
- Release signing where supported.

Chrome also notes that compromised developer accounts can push malicious extension updates, making account protection critical. citeturn734888search2

## Privacy-security boundary

Security logs must not become a covert behavioral analytics system.

Do not log:
- URLs
- page titles
- search terms
- messages
- screenshots
- exact usage timelines
- raw attention features

Log only necessary security events such as authentication failures, token rotation failures, device revocation and application errors, with short retention.

## Incident response

Production must have:
- credential revocation;
- device/session revocation;
- breach detection;
- user notification procedure;
- backup/restore tests;
- dependency emergency patch process;
- extension rollback/release process.

This document is an engineering baseline and should be reviewed against the actual production threat model and legal requirements.
