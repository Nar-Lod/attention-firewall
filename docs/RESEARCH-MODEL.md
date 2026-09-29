# Attention model — research specification

The current scoring system is a product heuristic, not a validated clinical instrument.

## Behavioral states

1. Focused — active work/learning or intentional activity with low drift signals.
2. Intentional — user appears to be following a declared purpose.
3. Neutral — insufficient evidence of drift.
4. Drifting — multiple signals indicate movement away from the user's intended activity.
5. Compulsive-risk — a high drift score suggests that ordinary low-friction interventions may be insufficient.
6. Recovering — user has exited an interruption loop and is transitioning to a selected next action.

## Signals

The first model uses coarse local signals:

- session duration;
- passive duration;
- interaction rate;
- scroll density;
- recent re-entry;
- context switching;
- declared intent match;
- outside-intent activity;
- time-window risk;
- notification-initiated launch, where a platform exposes that signal;
- recent intervention response.

No content semantics are required for the first model.

## Research questions

- Which combinations of signals best predict an imminent drift episode?
- How much friction is effective before users disengage from the product?
- Does personalized intervention selection outperform a fixed ladder?
- Does recovery guidance reduce immediate substitution into another distracting activity?
- Which features can be removed without materially reducing intervention quality?
- Can the model remain effective while operating entirely on-device?

## Evaluation

Primary local metrics:

- intervention acceptance rate;
- intentional-session completion rate;
- drift episode frequency;
- recovery completion;
- attention recovered;
- false intervention rate;
- intervention fatigue.

Do not interpret a product score as a diagnosis of addiction, disorder, or another health condition.

## Experimental discipline

Every future model change should specify:

- hypothesis;
- feature inputs;
- expected effect;
- offline test set;
- online test design;
- privacy impact;
- false-positive cost;
- rollback criterion.

Research exports, when needed, should be aggregated on-device and require explicit opt-in.
