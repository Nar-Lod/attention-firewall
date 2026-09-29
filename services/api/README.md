# Minimal cloud identity plane

The cloud service is deliberately not a behavioral analytics backend.

## Allowed responsibilities

- account identity mapping to an external auth provider subject;
- device registration and revocation;
- subscription entitlement;
- security/session lifecycle;
- optional coarse reliability diagnostics.

## Prohibited responsibilities

The cloud must not store:
- browsing history;
- visited URLs;
- page content;
- messages;
- screenshots;
- keystrokes;
- raw app-open timelines;
- raw attention features;
- local intervention histories.

## Device authentication

A device should generate a key pair in platform secure storage. Registration sends only the public key and platform metadata. Sensitive actions can require a server challenge signed by that device key.

This avoids placing long-lived device secrets in JavaScript storage.

## Deletion

Account deletion must revoke sessions/devices and delete cloud account/entitlement metadata according to the final retention schedule. Local behavioral data is deleted on-device by the client.

## Production note

This is a provider-neutral contract. Choose the authentication and billing vendors after the privacy/security review rather than coupling the core attention engine to a vendor SDK.
