---
name: multi-agent-orchestration
description: Use when a task may need specialist agents, parallel investigation, role routing, debate, review loops, approval gates, or explicit strategy selection before delegation.
---

# Multi-Agent Orchestration

## Core Rule

Lead owns strategy selection, specialist startup, conflict resolution, validation, and final claims. Scripts only generate read-only activation packets; they do not start agents or mutate repositories.

## Workflow

1. Start lead-only unless the task signals real coordination value.
2. Read `references/activation-rules.md` when strategy choice is not obvious.
3. Use `references/strategy-registry.toml` as the machine-readable strategy pool.
4. Run `npm run select -- --context-file context.json` or a strategy script with task-context JSON.
5. Review the packet, choose models in real time, then start specialists manually.
6. Use `references/sop.md` and `references/anti-patterns.md` before broad delegation.

## Resource Map

- `references/strategy-registry.toml`: strategy definitions and required evidence.
- `references/model-policy.toml`: model selection hints, not hard-coded assignments.
- `references/output-schema.md`: activation packet schema.
- `references/platform-compatibility.md`: Windows/macOS command and runtime notes.
- `references/research-basis.md`: industry, academic, and open-source basis for each strategy.
- `scripts/`: read-only selector and per-strategy packet generators.
