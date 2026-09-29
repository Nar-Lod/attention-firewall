# Security Policy

## Security baseline

Attention Firewall follows OWASP ASVS 5.0 for the web application and applies Chrome Manifest V3 extension security guidance.

Required controls:
- least privilege;
- strong authentication with MFA for maintainers;
- dependency scanning;
- CodeQL scanning;
- secure headers;
- strict input validation;
- no remote extension code;
- no secrets in client bundles;
- short-lived credentials;
- revocable devices;
- encrypted backups;
- incident response procedures.

## User-data security promise

The server is not intended to hold a raw behavioral timeline. A cloud breach should not reveal browsing history because the product does not collect a raw browsing history there by design.

## Reporting

Do not disclose a suspected vulnerability in a public issue. Use a private security advisory where GitHub supports it, or a verified private channel.

## Production release requirements

Before production:
- complete a threat-model review;
- perform privacy/legal review for the Kenya Data Protection Act;
- conduct a DPIA when the final processing operation is likely to create high risk;
- perform penetration testing;
- configure secure authentication;
- verify backup encryption and restoration;
- test account/device revocation;
- verify extension package integrity and release controls.
