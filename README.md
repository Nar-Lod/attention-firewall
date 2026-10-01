# Attention Firewall

Privacy-first attention management infrastructure.

Attention Firewall is designed to detect attention drift on-device, select the smallest effective intervention, help the user recover, and learn which interventions work for that person—without collecting raw browsing history, screen captures, message content, or detailed app-by-app timelines on a central server.

## Product thesis

**Protect the user's intention, not just their time.**

Core loop:

Intent → Detect → State → Intervene → Recover → Learn

## Privacy posture

The default architecture is **local-first**:

- Raw interaction events stay on the device.
- The Attention Drift model runs on-device.
- User goals, app/site rules, detailed session history, and intervention history are local by default.
- The server receives only minimal, purpose-bound telemetry needed for account security, subscription entitlement, reliability, and explicitly opted-in product improvement.
- No message content, screenshots, keystrokes, page bodies, or complete browsing histories are uploaded.
- Aggregation happens on-device before any optional analytics leave the device.
- Deletion and export are designed into the data model.

## Initial surfaces

- Browser extension: attention interventions for web sessions.
- Mobile shell: user configuration, local dashboard, and platform-specific usage adapters.
- Attention Engine: pure, deterministic TypeScript library for state scoring and intervention selection.
- API: minimal account, entitlement, device-registration, and coarse telemetry endpoints.

## Repository status

This repository is being built in phases. See docs/ROADMAP.md and docs/PRIVACY.md.

## Security and privacy

See:

- docs/PRIVACY.md
- docs/DATA-INVENTORY.md
- docs/THREAT-MODEL.md
- docs/ARCHITECTURE.md
- docs/IP-SPECIFICATION.md

## Development

The repository is a pnpm workspace.

~~~bash
pnpm install
pnpm test
pnpm lint
pnpm build
~~~

## Disclaimer

The privacy and compliance documents are engineering/product specifications, not legal advice. The product should undergo a formal Kenya Data Protection Act review and, where required, a Data Protection Impact Assessment before production processing at scale.


## Development roadmap and time budget

The fragmented execution plan is maintained in [docs/ROADMAP.md](docs/ROADMAP.md). It allocates a maximum of **120 minutes per development day**, with research and acceptance criteria before implementation, and validation before a chunk is marked complete.

- **Total planned effort:** 46 hours across 10 sections.
- **Completed sections:** 16 hours allocated retrospectively (Sections 01–04); these are estimates, not verified time logs.
- **Remaining:** 30 hours, or 15 two-hour development blocks.
- **Current effort-indexed position:** Development Day 9, Section 05 (signal bridge and recovery lifecycle) in progress.
- **Projected finish:** October 16, 2026, if the next work block starts October 2 and work happens daily. Missed days shift the date.
- Percentages in the roadmap describe effort allocation, not verified code-completion percentages.

The roadmap includes section-by-section research instructions, small indexed work blocks, daily execution protocol, and completion gates. Re-estimate after research or test findings change scope.
