# Codex Configuration Optimization Report

Date: 2026-06-01
Branch: `release/codex-main-en`

## Objective

Improve this Codex-focused agent harness with evidence rather than subjective prompt churn. The work followed the GPT-5.5-PRO taskflow: build a deterministic validation spine first, then add measurable context, memory, and self-evolution governance.

## Sources Used

- User-provided analysis: `D:\downloads\codex_agent_settings_optimization_taskflow.md`
- Repository evidence: `AGENTS.md`, `.codex/`, `.agents/skills/`, `.harness/`, `docs/harness/`
- External research summary from researcher subagent, using official OpenAI Codex docs, OpenAI eval guidance, Anthropic agent engineering posts, Inspect AI docs, LangChain context-engineering writing, and `worldflowai/everything-claude-code`
- Critic subagent pressure test on context, memory, and self-evolution governance

## Changes

### Milestone 1: Deterministic Validation Spine

Commit: `df376de Build deterministic validation spine`

Added:

- root `npm run validate`
- `.github/workflows/validate.yml` with `contents: read`
- static validation script for TOML, YAML, skill frontmatter, Codex agent sidecars, schemas, fixtures, eval tasks, and governance policy invariants
- strategy context, activation packet, and fixture JSON schemas
- four deterministic strategy fixtures and snapshots
- activation packet audit fields: `selected_strategy`, `reason`, `agents`, `expected_outputs`
- docs for adding fixtures and strategies

### Milestone 2: Context, Memory, And Self-Evolution Gates

Commit: `5ae3230 Gate context memory and harness evolution`

Added:

- `harness-evolution` skill
- context governance policy and docs
- trusted memory-write authorization definition
- memory safety fields for source trust, secret scan, instruction-like content, raw-log rejection, redaction, authorization, and supersession
- self-evolution requirement for same-fixture or same-trace before/after evidence
- four governance pressure evals:
  - `memory_trusted_source_spoof`
  - `memory_stale_duplicate`
  - `skill_evolution_before_after`
  - `context_budget_raw_log`
- rubric criteria for trusted memory authorization, memory safety review, and self-evolution before/after evidence

## Quantitative Results

Command:

```powershell
npm run validate
```

Latest result:

```txt
static_config_valid = true
toml_files_checked = 11
yaml_files_checked = 25
skill_metadata_files_checked = 8
codex_agent_files_checked = 8
schema_files_checked = 3
fixture_files_checked = 6
eval_tasks_checked = 18
governance_policy_checks = 16
strategy_registry_errors = 0
activation_examples_failed = 0 / 16
fixture_pass_rate = 1.0
strategy_selection_accuracy = 1.0
required_field_pass_rate = 1.0
snapshot_stability = 1.0
wrapper_failures = 0
```

Behavior fixed during validation and review:

- A PR review mentioning `auth` was initially misrouted to `human-approval-gate`.
- The fixture caught it as `fixture_pass_rate = 0.75` and `strategy_selection_accuracy = 0.75`.
- The high-risk detector was refined to distinguish read-only sensitive review from destructive action intent.
- Reviewer pressure testing found two more selector regressions:
  - raw `validation_commands` did not imply `validation_available`
  - read-only wording like "remove an unused import" could be treated as destructive
- Both regressions were fixed and added as deterministic fixtures.
- After the fixes, all 6 fixture metrics returned to `1.0`.

## Scientific Rationale

The optimization uses deterministic evaluation first because live LLM runs have model, context, latency, and tool-use variance. The validation spine now checks decision contracts before any future live Codex A/B eval.

The next live eval layer should compare `baseline`, `root_only`, and `full_harness` across the existing `.harness/evals/tasks.yaml` suite and record:

- weighted rubric score
- tool calls
- wall-clock time
- validation status
- over-delegation rate
- high-risk gate recall
- memory poisoning rejection rate
- context-package precision
- token/cost when available

## Current Conclusion

This branch is materially stronger than the starting point because the harness now has a repeatable gate for configuration correctness and strategy behavior. The improvement is not yet a claim that every live Codex task will score higher; it is a measured claim that strategy activation, safety routing, and governance rules are now checkable and regression-resistant.

The strongest measured evidence is deterministic:

- 100% strategy fixture pass rate across 6 deterministic routing cases
- 100% strategy selection accuracy for those fixtures
- 100% activation-packet required-field coverage
- 100% snapshot stability
- 0 wrapper contract failures

## Remaining Risks

- Live Codex A/B quality improvement is designed but not yet executed.
- The governance eval tasks are defined and statically validated; they still need trace-based runs and scoring.
- Hook/plugin packaging is intentionally deferred until the validation and eval surfaces are stable.
- External source findings can drift; official Codex docs and community repo metrics should be refreshed before future packaging decisions.
