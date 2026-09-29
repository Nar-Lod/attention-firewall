# Encrypted settings sync

Settings sync is optional and off by default.

The client encrypts selected user configuration before upload using the sync-vault package.

## Syncable data

Allowed:
- protection rules;
- commitments;
- intent templates;
- intervention preferences;
- non-behavioral application settings.

Not allowed:
- browsing history;
- raw URLs;
- page contents;
- screenshots;
- raw activity events;
- daily behavioral history;
- attention scores;
- intervention timeline.

## Server contract

POST /api/sync/vault
- receives an authenticated account and opaque encrypted envelope;
- stores ciphertext only;
- must not inspect or index decrypted fields.

GET /api/sync/vault
- returns opaque encrypted envelope.

DELETE /api/sync/vault
- deletes the stored envelope.

The sync passphrase is never sent to the server.
A lost passphrase means the server cannot recover the encrypted settings.
