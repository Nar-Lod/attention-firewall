# Android adapter

Implementation target: Kotlin.

Required capability: user-granted usage access for UsageStatsManager.

Adapter responsibilities:
1. detect app foreground transitions;
2. derive coarse session features;
3. invoke the shared Attention Engine;
4. trigger a local intervention;
5. discard raw event details after feature extraction.

Do not request contacts, location, microphone, camera, SMS or notification contents.
