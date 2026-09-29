# Trust boundaries

## Boundary 1: user device

The device is trusted only to the extent that its operating system, browser and application installation are not compromised.

Attention Firewall cannot guarantee confidentiality on a device with malware, a rooted/jailbroken operating system, a compromised browser profile or a malicious administrator.

Recommended product protections:
- use OS secure storage for credentials;
- use device encryption where supported;
- require current OS/browser versions for supported releases;
- invalidate devices after suspicious authentication activity.

## Boundary 2: browser page

A web page is untrusted.

Content scripts:
- receive no secrets;
- receive no raw browsing history;
- send only bounded aggregate counters;
- validate all messages before privileged actions.

## Boundary 3: cloud

The cloud is an untrusted storage boundary by design.

The application should not depend on the cloud for behavioral truth. If a backend is compromised, the attacker should not obtain a central browsing timeline because one is not stored.

## Boundary 4: third-party services

Authentication, payments, hosting and crash/diagnostic providers are subprocessors/service providers that must be assessed before production use.

Do not send behavioral data to a third-party provider merely because its SDK is convenient.

## Boundary 5: maintainers

Maintainer accounts can change client code distributed to users. Therefore:
- MFA/security keys are required;
- release access must be limited;
- protected branches and reviewed pull requests are required;
- secrets must never be committed;
- extension release artifacts should be integrity-checked.

## Key compromise assumptions

If an account/session token is stolen:
- revoke the session;
- rotate credentials;
- revoke affected device identifiers;
- investigate authentication logs.

A stolen account token must not reveal local behavioral history because local behavioral history is not synchronized to the account.
