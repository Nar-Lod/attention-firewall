# Data inventory

| Data | Location | Required | Purpose | Default retention |
|---|---|---:|---|---|
| Current intent | Device | Yes for intent mode | Compare behavior to declared goal | Until session ends |
| Domain/app rule | Device | Optional | Apply user controls | Until user deletes |
| Raw platform event | Device memory | Technical | Derive features | Seconds/minutes |
| Session features | Device | Yes | Attention-state detection | 30 days |
| Intervention outcome | Device | Yes | Personalize interventions | 90 days |
| Recovery preference | Device | Optional | Recovery suggestions | Until user deletes |
| Account email/identifier | Cloud | Only with account | Authentication | Account lifetime |
| Subscription entitlement | Cloud | Paid users | Billing access | Subscription lifecycle |
| Device registration token | Cloud | Account/sync users | Device management | Until revoked |
| Crash/version diagnostics | Cloud | Optional where feasible | Reliability | Limited operational period |
| Raw URL | Cloud | Never | None | Never collected |
| Page content | Cloud | Never | None | Never collected |
| Message content | Cloud | Never | None | Never collected |
| Screenshot | Cloud | Never | None | Never collected |
| Precise location | Cloud | Never | None | Never collected |

## Collection test

Before adding a field, answer:

1. What exact user-facing function requires it?
2. Can the function run locally?
3. Can a derived value replace the raw value?
4. Can the field be ephemeral?
5. Is collection optional?
6. What is the deletion path?
7. What is the security consequence of storing it?
