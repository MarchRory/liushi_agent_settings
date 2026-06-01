# Agent Specialization Review

Date: 2026-06-02
Branch: `release/codex-main-en`

## Problem

The Codex subagent entrypoints had a shared template shape: mission sentence, expansion resources, input contract, output contract, and generic rules. The sidecar `AGENT.md` files also mostly used a generic `Scope` section. That made the agents mechanically correct but not sharp enough for lane-specific delegation.

## Change

Each Codex subagent now has explicit role specialization in the runtime TOML and sidecar docs:

- `codebase-explorer`: repository cartography and change-surface recovery.
- `architect`: interface, lifecycle, protocol, migration, and rollback design.
- `implementer`: scoped patch execution with source/materialized boundary awareness.
- `tester`: validation engineering and failure reproduction.
- `reviewer`: defect-focused diff triage.
- `critic`: adversarial failure-mode and assumption pressure testing.
- `researcher`: external primary-source evidence synthesis.
- `memory-curator`: durable memory governance.

Each agent now declares:

- `Specialized lane`
- `Reject / redirect`
- `Sharp deliverables`

## Measurement

Static validation now enforces the specialization markers:

```txt
codex_agent_specificity_checks = 24
codex_agent_sidecar_specificity_checks = 24
```

The checks cover 8 agents x 3 runtime TOML markers and 8 agents x 3 sidecar sections.

## Validation

`npm run validate` passed after the change. Deterministic orchestration metrics stayed green:

```txt
fixture_count = 6
fixture_pass_rate = 1
strategy_selection_accuracy = 1
required_field_pass_rate = 1
snapshot_stability = 1
```

## Rollback Trigger

Rollback or revise if specialized wording causes the lead to over-delegate, blocks normal role handoff, or if live evals show lower task completion quality than the previous generic agent definitions.
