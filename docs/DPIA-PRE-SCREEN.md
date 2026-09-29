# DPIA pre-screen

This is an engineering pre-screen, not legal advice.

## Why we are doing this early

The Kenya Data Protection Act requires data protection by design/default and appropriate technical and organisational measures. The Data Protection (General) Regulations identify several situations that can trigger DPIA requirements, including innovative technology, large-scale processing, sensitive data, children's data, certain profiling/automated decision-making, and changes that materially increase risk. citeturn826630search18turn826630search20

## Current design

The default consumer mode avoids centralized behavioral profiling:
- no raw browsing history on the server;
- no page contents;
- no screenshots;
- no messages;
- no precise location;
- detailed attention state kept locally.

This materially reduces central exposure but does not eliminate all compliance obligations.

## DPIA gate

Before production launch, perform a formal assessment covering:
1. categories of users and whether children are included;
2. all platform permissions;
3. local and cloud data flows;
4. profiling/automated intervention effects;
5. retention;
6. cross-border processing and vendors;
7. security threats;
8. user rights and deletion;
9. processor/controller roles;
10. incident response.

## Change-control trigger

A new DPIA review is required when a feature changes:
- the purposes of processing;
- categories of personal data;
- retention;
- scale;
- third-party sharing;
- automated decision impact;
- children/vulnerable-user processing;
- international transfers.

ODPC guidance states that DPIA work should begin as early as practicable and be revisited when risk changes. citeturn826630search19
