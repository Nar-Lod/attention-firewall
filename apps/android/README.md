# Android application

The Android implementation starts with the minimum practical permission: Usage Access.

The first adapter uses UsageStatsManager to derive local, coarse usage summaries. Android Keystore stores the local AES-GCM key.

## Current scope

- usage-access onboarding;
- local coarse usage summary;
- encrypted local persistence;
- local Attention Engine;
- optional Hard Protection with an AccessibilityService that requests window-state callbacks only and explicitly declares `canRetrieveWindowContent=false`;
- local protected-app selection.

## Privacy boundary

The AccessibilityService does not retrieve window content. It derives only the foreground package transition needed to activate a user-selected local rule.

The service must not collect:
- screen text;
- screenshots;
- passwords;
- messages;
- notification contents;
- contacts;
- location.

## Google Play requirement

This is not an accessibility tool for disability support. Google Play requires apps using AccessibilityService for other purposes to complete the accessibility declaration and provide prominent in-app disclosure and affirmative consent. The app should use narrower APIs where possible. citeturn548052search1turn548052search4

Accordingly, Hard Protection is optional, requires an in-app disclosure and affirmative action, and remains disabled until the user enables it in Android Settings.

## Deliberately deferred

- notification-content access;
- contacts;
- location;
- microphone/camera;
- cloud behavioral synchronization.

## Build

The configured project uses Android Gradle Plugin 9.4.0; AGP 9.4 supports API 37 and pairs with Gradle 9.6.0. citeturn507127search3
