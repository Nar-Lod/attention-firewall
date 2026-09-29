# Product Naming Direction

Status: exploration — no public rename is applied yet.

## Naming brief

The current working name, **Attention Firewall**, is useful as an engineering description but is too technical and defensive for the consumer-facing product we want on Google Play, desktop, and marketing surfaces.

The final name should:
- describe a positive outcome rather than a restriction;
- be easy to say, spell, remember, and search;
- work as an app icon and a one-word spoken brand;
- feel credible for both everyday users and serious professionals;
- leave room for attention protection, recovery, insights, device controls, and future AI-assisted guidance;
- avoid implying surveillance, parental control, blocking-only behavior, or clinical treatment;
- be distinct enough to investigate for trademarks, app-store conflicts, domains, and social handles before adoption.

## Brand territories

### 1. Intent / agency
Names in this territory communicate choosing what deserves attention.

- **Intentia** — intent + a human/productive ending.
- **Deliber** — deliberate action, shortened into a brand form.
- **Intenta** — simple and direct, but availability must be checked.
- **Aimora** — aim + a warmer consumer feel.

### 2. Calm / focus
Names communicate a protected mental space without sounding like a blocker.

- **Stillora** — stillness + modern product sound.
- **Focusra** — focus + a compact brand ending.
- **Steady** — extremely clear, but likely crowded and therefore requires rigorous availability checks.
- **Clearpath** — communicates direction and reduced drift, but likely crowded.

### 3. Guardrail / protection
Names preserve the protective character of Attention Firewall without sounding like security software.

- **Guardly** — approachable protection, but requires strong trademark/app-store checks.
- **Holdfast** — memorable and protective, but existing usage is likely.
- **Redline** — strong conceptually, but too many existing meanings/products.
- **Anchor** — excellent metaphor, but highly crowded.

### 4. Recovery / return
Names focus on the distinctive loop: notice drift → interrupt → recover → return to intention.

- **Return** — powerful product concept, but generic/crowded.
- **Recenter** — clear behavior, likely crowded.
- **Resetline** — stronger product identity, but still descriptive.
- **Backto** — intentionally conversational; availability uncertain.

## Current working shortlist

For the next design iterations, the strongest *brand directions to investigate* are:

1. **Aimora**
2. **Intentia**
3. **Stillora**
4. **Deliber**
5. **Focusra**

This is not a ranking or final selection. The shortlist is a set of directions to test against trademark databases, Google Play, Apple App Store, domains, social handles, pronunciation, spelling, and international meaning.

## Naming decision gate

Do not rename the repository, package IDs, Android application ID, extension ID, URLs, or production project until one candidate passes:

1. trademark/conflict screening in target markets;
2. Google Play and Apple App Store conflict screening;
3. domain/handle screening;
4. pronunciation and spelling test;
5. privacy/security perception test;
6. icon and wordmark test;
7. product-line test: “Name Today”, “Name Recovery”, “Name Insights”, “Name for Android”.

Until then, **Attention Firewall** remains the internal product codename.

## Product architecture implication

The eventual consumer brand should sit above the protection engine.

Example:

**Consumer brand**
→ Today
→ Focus / Intent
→ Protection
→ Recovery
→ Insights
→ Device

**Internal technical layer**
→ attention-runtime
→ policy-engine
→ secure-browser-store
→ runtime-protocol

This keeps the technical architecture stable even if the public brand changes.
