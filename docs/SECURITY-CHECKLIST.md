# Production security checklist

## Before beta

- [ ] package manager lockfile committed
- [ ] dependency audit clean
- [ ] CodeQL clean
- [ ] extension static security check clean
- [ ] no secrets in repository
- [ ] HTTPS-only production origin
- [ ] secure cookie/session configuration
- [ ] authentication MFA/passkey design reviewed
- [ ] device revocation implemented
- [ ] backups encrypted
- [ ] recovery tested
- [ ] privacy controls tested
- [ ] export/deletion tested
- [ ] browser permissions reviewed
- [ ] iOS/Android permissions reviewed

## Before public launch

- [ ] penetration test
- [ ] privacy/legal review
- [ ] DPIA completed if triggered
- [ ] processor/vendor inventory complete
- [ ] breach-response runbook tested
- [ ] vulnerability disclosure process published
- [ ] extension release process protected by hardware-backed MFA
- [ ] production secrets stored in managed secret storage
- [ ] logs reviewed for accidental behavioral data
- [ ] rate limits tested
- [ ] abuse monitoring implemented without collecting unnecessary content

## Red lines

Do not ship if:
- raw URLs are stored centrally;
- raw page contents are stored centrally;
- the extension executes remote code;
- authentication tokens are stored in localStorage;
- privileged extension messages are accepted without validation.
