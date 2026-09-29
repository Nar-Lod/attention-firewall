# Encrypted settings sync

Settings sync is optional and off by default.

The client encrypts settings before upload. The server stores only the opaque encrypted envelope.

## Syncable settings

Allowed:
- protection mode;
- explicit site/application rules;
- user commitments;
- current intent/template information;
- non-behavioral application preferences.

Excluded:
- daily behavioral history;
- attention scores;
- learned intervention profile;
- security-event history;
- raw URLs;
- page contents;
- screenshots;
- raw activity events;
- notification content.

The allowlist is implemented in the sync-vault package and is tested.

## Transport

The browser sync client uses credentials: include for the authenticated session cookie and sends only the encrypted envelope.

The server validates envelope shape and version but does not decrypt it.

## Failure behavior

- missing authentication: reject;
- payload too large: reject;
- invalid envelope: reject;
- persistence unavailable: return service-not-configured;
- version conflict: reject rather than overwrite silently.

## Security

The sync passphrase is never transmitted.

A lost passphrase means the server cannot recover the configuration. This is intentional.

Never silently expand the sync allowlist. A new field requires privacy/security review.
