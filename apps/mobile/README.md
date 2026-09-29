# Mobile implementation

The mobile application is intentionally a thin shell around the local Attention Engine.

## Android

Use UsageStatsManager after the user grants usage access. The Android adapter should read only the event types required to derive coarse features, then discard the raw events.

The adapter must never upload the raw UsageEvents stream.

## iOS

Use Family Controls authorization and Device Activity/Managed Settings where supported. The product should prefer tokenized selections and local decisions.

The iOS implementation requires Apple's Family Controls entitlement and the corresponding App Store approval process.

## Shared contract

Both platforms map into:

- sessionSeconds
- recentReopens
- passiveSeconds
- interactionRate
- contextSwitches
- declaredIntentMatch
- outsideIntent
- lateNightRisk
- notificationLaunch
- previousInterventionIgnored

No platform-specific raw event object crosses into the shared cloud contract.

## Local database

Recommended local entities:

- LocalProfile
- IntentSession
- SessionFeatureSummary
- InterventionOutcome
- RecoveryAction
- PrivacySettings

No remote behavioral-history synchronization.
