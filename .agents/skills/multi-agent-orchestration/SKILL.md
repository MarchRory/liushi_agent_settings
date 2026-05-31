---
name: multi-agent-orchestration
description: Use when a task may need specialist agents, parallel investigation, role routing, debate, review loops, approval gates, or explicit strategy selection before delegation.
---

# Multi-Agent Orchestration

## Core Rule

Lead owns strategy selection, specialist startup, conflict resolution, validation, and final claims. Scripts only generate read-only activation packets; they do not start agents or mutate repositories.

## Lead Judgment Prompt

Before running any script, analyze the task as Lead:

- What outcome is needed, and what would make the work actually correct?
- Can Lead finish it alone faster and safer than coordinating specialists?
- Which parts are independent, sequential, uncertain, risky, or validation-heavy?
- What evidence is already available, and what evidence must be collected before delegation?
- Which strategy fits the task shape, and why are the nearest alternatives worse?
- What must specialists not do, including permissions, scope, files, tools, and stop conditions?

Use `lead_analysis` to capture the task decomposition and `lead_strategy_reason` to capture the chosen strategy rationale. Structured context fields are useful when they make checks repeatable, but they do not replace Lead judgment. If the script recommendation conflicts with the Lead analysis, do not blindly follow the script; record the override reason and use the safer or more evidence-grounded path.

## Workflow

1. Start lead-only unless the task signals real coordination value.
2. Write a compact task context with `task_summary`, `lead_analysis`, `lead_strategy_reason`, observed signals, risks, and validation path.
3. Read `references/activation-rules.md` when strategy choice is not obvious.
4. Use `references/strategy-registry.toml` as the machine-readable strategy pool.
5. Run `npm run select -- --context-file context.json` or a strategy script with task-context JSON.
6. Review the packet: if evidence is missing, over-delegated, unsafe, or less accurate than Lead judgment, revise context or override with a recorded reason.
7. Choose models in real time, then start specialists manually with scoped handoffs.
8. Use `references/sop.md`, `references/strategy-playbooks.md`, and `references/anti-patterns.md` before broad delegation.

## Resource Map

- `references/strategy-registry.toml`: strategy definitions and required evidence.
- `references/model-policy.toml`: model selection hints, not hard-coded assignments.
- `references/output-schema.md`: activation packet schema.
- `references/platform-compatibility.md`: Windows/macOS command and runtime notes.
- `references/research-basis.md`: industry, academic, and open-source basis for each strategy.
- `references/strategy-playbooks.md`: explicit context fields and SOP for each strategy.
- `scripts/`: read-only selector and per-strategy packet generators.
- `fixtures/`, `schemas/`, and `snapshots/`: deterministic validation spine for strategy activation behavior.
