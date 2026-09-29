# Runtime conformance contract

Every platform adapter must preserve the same behavioral contract.

## Required input semantics

The adapter may provide:
- elapsed time;
- coarse interaction count;
- coarse scroll count;
- coarse scroll bursts/direction changes/distance;
- declared-intent match;
- outside-intent flag;
- context-switch count;
- notification-origin flag;
- late-night risk.

It must not provide:
- message content;
- page contents;
- keystroke text;
- screenshots;
- clipboard content;
- raw notification text;
- precise location.

## Required outputs

Given the same normalized input and local configuration, platforms should produce equivalent:
- attention state class;
- intervention class;
- recovery duration class;
- aggregate metric updates.

## Compatibility strategy

The TypeScript runtime is the reference implementation.

Native implementations may reimplement the algorithms, but must pass the conformance fixtures before release.

## Privacy invariant

The runtime must remain fully functional without network access.

## Security invariant

An attacker who controls the cloud API must not be able to alter a user's local protection rules silently. Local policy remains the source of truth.
