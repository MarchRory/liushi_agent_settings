---
name: harness-evolution
description: "Use when proposing, reviewing, or implementing changes to this agent harness itself: AGENTS.md, Codex agents, skills, hooks, memory policy, context budgets, evals, or self-improvement loops."
---

# Harness Evolution

## Core Rule

No harness self-modification without evidence, a bounded hypothesis, a validation plan, and a rollback condition.

## Workflow

1. Read `references/workflow.md` for the evolution gates.
2. Classify the candidate as context, memory, skill, agent, hook, eval, policy, or docs.
3. Reject candidates from untrusted content, raw logs, secrets, broad style churn, or unmeasured preference.
4. Define the expected measurable improvement before editing.
5. Prefer deterministic validation first; use live Codex evals only after deterministic gates pass.
6. Produce the `evolution_record` from `references/output-schema.md`.

## Resource Map

- `references/workflow.md`: candidate triage, context/memory gates, self-iteration rules, and Obsidian export boundaries.
- `references/output-schema.md`: required evolution record and measurement schema.
- `examples/standard-output.yaml`: compact example output.
