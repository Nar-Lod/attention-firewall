# Encrypted settings sync

Settings sync is optional and off by default.

## What can sync

Only encrypted configuration:
- protection rules;
- commitments;
- intent templates;
- intervention preferences;
- non-behavioral application settings.

## What must never sync through the vault

- browsing history;
- raw URLs;
- page contents;
- screenshots;
- raw activity events;
- daily behavioral history;
- attention scores;
- intervention timeline;
- security-event history.

## Cryptographic model

The client encrypts configuration before upload using AES-GCM with a passphrase-derived key.

The passphrase is never transmitted.

The server stores only:
- version;
- algorithm metadata;
- KDF metadata;
- salt;
- IV;
- ciphertext.

The server does not decrypt or index the plaintext.

## Recovery trade-off

A lost sync passphrase means the server cannot recover the vault contents. This is intentional.

## Production requirements

Before enabling server sync:
- authenticated account/device session;
- rate limiting;
- maximum envelope size;
- optimistic concurrency/versioning;
- server-side envelope validation;
- encrypted database/storage;
- deletion endpoint;
- audit events without behavioral metadata;
- breach-response procedure;
- subprocessor assessment;
- privacy notice update;
- DPIA review if the final processing operation triggers one.
