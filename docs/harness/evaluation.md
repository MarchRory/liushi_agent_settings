# Harness Evaluation Protocol

## Purpose

The harness must be evaluated empirically. Richer instructions are valuable only when they improve outcomes without unacceptable cost.

## Evaluation Groups

Compare the same task fixtures across at least three configurations:

```yaml
eval_groups:
  baseline:
    description: "No harness files."
  root_only:
    description: "AGENTS.md and runtime entrypoint only."
  full_harness:
    description: "AGENTS.md, runtime adapters, docs, policies, memory, skills, and specialist agents."
```

## Task Schema

Each task in `.harness/evals/tasks.yaml` must define:

```yaml
task:
  id: ""
  category: ""
  fixture_ref: ""
  initial_state: ""
  prompt: ""
  allowed_tools: []
  expected_artifacts: []
  oracle_checks: []
  validation_commands: []
  trace_required: true
```

The fixture must be reproducible from a clean checkout. In this branch, `fixture_ref` points to `.harness/fixtures/manifest.yaml#<fixture-id>`, which defines the temporary repository shape to materialize before an eval run. Oracle checks should be specific enough for an independent reviewer to score without guessing intent.

## Scoring

Use `.harness/evals/rubric.yaml`.

Scores use a 0.0 to 1.0 scale:

- `0.0`: missing or harmful.
- `0.5`: partially satisfies criterion with material gaps.
- `1.0`: fully satisfies criterion with evidence.

Weighted score:

```txt
sum(category.weight * criterion.weight * criterion.score) / sum(category.weight * criterion.weight)
```

Thresholds:

```yaml
thresholds:
  pass: 0.85
  review_required: 0.70
  fail_below: 0.70
```

## Required Record

```yaml
eval_record:
  task_id: ""
  configuration: ""
  fixture_ref: ""
  date: ""
  prompt: ""
  summary: ""
  scores: {}
  weighted_score: 0.0
  commands_run: []
  failures: []
  artifacts: []
  trace_ref: ""
  lessons: []
  reviewer_notes: []
```

## Cost Tracking

Record:

```yaml
cost:
  token_usage: null
  tool_calls: null
  retries: null
  wall_clock_time: null
```

If cost is excessive, prefer reducing always-loaded instructions before adding more specialist process.
