# Attention Firewall Design System

## Product direction

Attention Firewall is a serious personal attention-control product, not a productivity dashboard. The visual language must communicate calm authority, trust, privacy, and intentional friction.

The same design system should scale across:
- web control plane
- browser extension
- Android device app / launcher
- future iOS app

## Design principles

1. **Calm over gamification** — no dopamine-heavy badges, streak pressure, or noisy dashboards.
2. **Trust is visible** — privacy state, local processing, permissions, and recovery must be understandable without reading technical documentation.
3. **Intervention is a moment** — when attention is drifting, the UI becomes focused and deliberate rather than decorative.
4. **Progress is useful** — show recovered attention and intentional behavior, not vanity scores.
5. **Device-native where necessary** — Android intervention surfaces should feel native and immediate; web can carry the broader brand.
6. **Accessibility is structural** — keyboard focus, contrast, readable type, reduced motion, large touch targets, and screen-reader labels are requirements.
7. **Security never depends on appearance** — visual privacy indicators supplement, never replace, actual permission boundaries and local encryption.

## Brand foundation

Core palette:
- Ink: near-black backgrounds and primary text surfaces.
- Maroon: structural brand color and deep emphasis.
- Signal red: intervention/action state.
- Warm gold: trust, recovery, selected state, and key metrics.
- Bone/white: primary readable text.
- Neutral gray scale: supporting information.

Use red sparingly. A red element should mean that attention requires action. Gold should mean trusted, selected, recovered, or important.

## Product hierarchy

Every primary screen should answer these questions in order:
1. What is happening to my attention?
2. Why did the system react?
3. What can I do now?
4. What data was used?
5. What happens next?

## Core surfaces

### 1. Home / Today
The calm daily command center:
- current attention state
- active intention
- session progress
- recovered attention
- one next action
- privacy status

### 2. Intervention
A deliberately minimal screen:
- reason
- intervention level
- one primary intentional action
- one recovery path
- escape/recovery always visible where applicable

### 3. Policies
Rules, protected apps/sites, schedules, commitments, and escalation levels.

### 4. Insights
Patterns rather than surveillance:
- drift windows
- recovered time
- intervention response
- attention twin trends
- all computed locally

### 5. Privacy & Security
Permissions, local storage, export/delete controls, security events, recovery configuration, and device status.

### 6. Device
Protected apps, accessibility status, launcher preparation, recovery, and future device-role controls.

## Component language

- Cards should be restrained, with generous spacing and clear hierarchy.
- Buttons should have one obvious primary action.
- Avoid dense borders and repeated labels.
- Use typography and spacing before decoration.
- Motion should explain state changes and never create urgency.
- Mobile touch targets should be at least 44px.
- Desktop controls should preserve keyboard focus visibility.

## Release sequence

1. Foundation tokens
2. Typography and spacing
3. Navigation shell
4. Home / Today
5. Intervention surface
6. Policy management
7. Privacy & Security
8. Insights
9. Android native surfaces
10. Browser extension surfaces
11. Accessibility and responsive QA

The existing UI is a functional prototype. It should be visually replaced in this sequence rather than incrementally decorated forever.
