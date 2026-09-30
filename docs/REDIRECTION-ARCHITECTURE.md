# Attention Firewall — Redirection Architecture

The benchmark direction is now part of the product architecture, not a cosmetic intervention.

## Core loop

**Context → intention → risk → intervention → alternative action → outcome learning**

The Firewall should intervene in the small window before a distraction becomes a long session.

## Block → Redirect → Resume

1. **Block / delay** — introduce deliberate friction when a protected app is opened or drift rises.
2. **Redirect** — offer the user's intentional apps: Notes, To-Do, Calendar, or the current task.
3. **Resume** — return the user to the declared intention or a concrete next action.
4. **Learn locally** — record only bounded intervention outcomes and aggregate attention signals on-device.

## Redirect shelf

The shelf is personalized locally. Initial Android destinations:
- Notes
- To-Do List
- Calendar
- the user's saved local next-task cue

The system may suggest a specific task cue when one exists. External calendar/task data must be explicitly connected and permissioned; raw task contents are never sent to the behavioral cloud.

## Intent choices

The intervention model supports the user's reason for opening a distracting app:
- I need to message someone.
- I'm looking for something.
- I'm bored.
- I don't know.

The response can then route to an appropriate intentional action instead of assuming every app opening is bad.

## Escalation

- **Standard:** awareness and gentle friction.
- **Focus:** stronger delay and redirect.
- **Deep Focus:** after sustained local scroll-loop evidence, offer redirect and, when configured, automatically open the first available productive destination after a short visible countdown.
- **Recovery:** prioritize leaving the loop and completing a recovery action.

Automatic redirect is bounded, visible, cancelable during the countdown, and never disables the user's recovery path.

## Doom-scroll signal

Android can receive TYPE_VIEW_SCROLLED events without retrieving window content. The service uses bounded local counts and timing to detect sustained passive-scroll patterns. It does not read screen text, messages, passwords, screenshots, or page contents.

## Privacy boundary

No raw scroll timeline, task contents, app content, screenshots, keystrokes, or precise behavioral history is uploaded. Local intervention outcomes may update the on-device intervention profile and Attention Twin.

## Design principle

The Firewall should not merely prevent an action. It should make the **next intentional action easier than returning to the distraction**.
