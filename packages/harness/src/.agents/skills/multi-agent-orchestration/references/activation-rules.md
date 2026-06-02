# Activation Rules

## Decision Order

1. Prefer `lead-only-default` for small, local, low-risk tasks.
2. If a high-risk signal appears, choose `human-approval-gate` before any other strategy.
3. If external research is broad and parallelizable, choose `parallel-research-swarm`.
4. If work spans domains or permission scopes, choose `supervisor-router`.
5. If the task has stable stages, choose `sop-assembly-line`.
6. If a change needs validation and review, choose `reviewer-tester-loop`.
7. If many independent items need the same pass, choose `batch-map-reduce`.
8. If uncertainty is high and options conflict, choose `debate-critic-panel`.
9. Use `selector-group-chat` only for bounded nonlinear exploration.

## Scoring

Strategy scripts compute a deterministic advisory score from task signals:

- Required signal matches raise score.
- Contraindication matches make the strategy ineligible.
- `human-approval-gate` overrides non-gate strategies when high-risk signals exist.
- Lead can override the advisory result, but must record the reason.

## Task Context JSON

```json
{
  "task_summary": "",
  "signals": [],
  "lead_analysis": "",
  "lead_strategy_reason": "",
  "risks": [],
  "files_or_sources": [],
  "requires_edit": false,
  "requires_research": false,
  "parallelizable": false,
  "sensitive_domains": [],
  "validation_available": false,
  "operation": "",
  "target": "",
  "risk_statement": "",
  "safer_alternative": "",
  "source_list": [],
  "source_priority": "",
  "date_or_version_context": "",
  "uncertainty_notes": "",
  "routing_reason": "",
  "agent_scope_boundaries": [],
  "handoff_constraints": [],
  "stage_plan": [],
  "stage_exit_gates": [],
  "validation_path": "",
  "competing_options": [],
  "decision_criteria": [],
  "critique_questions": [],
  "diff_scope": "",
  "validation_commands": [],
  "review_scope": "",
  "item_partition": [],
  "per_item_output_schema": {},
  "reduce_rule": "",
  "turn_budget": 0,
  "speaker_selection_rule": "",
  "lead_checkpoint_rule": "",
  "approval_record": {
    "approved": false,
    "approver_source": "",
    "exact_operation": "",
    "exact_target": "",
    "timestamp": "",
    "risk_acknowledged": false
  },
  "model_decision": {
    "chosen_model": "",
    "reasoning_effort": "",
    "cost_risk": "",
    "why_this_model": "",
    "fallback_model": ""
  }
}
```

All fields are optional for scripts, but sparse context lowers confidence.

## Evidence Rules

- Lead analysis is first-class evidence. The selector accepts structured fields when available and can also accept concise `lead_analysis` / `lead_strategy_reason` when the lead has already decomposed the task clearly.
- Signals can select candidate strategies, but signals alone must not satisfy detailed evidence fields.
- `batch-map-reduce` requires explicit `item_partition`, `per_item_output_schema`, and `reduce_rule`.
- `selector-group-chat` requires explicit `turn_budget`, `speaker_selection_rule`, and `lead_checkpoint_rule`.
- `human-approval-gate` requires exact operation/target/risk/safer alternative before the gate packet is complete. Risky action still requires a valid `approval_record` and `safety_gate.action_may_proceed=true`.
- Use `references/strategy-playbooks.md` for per-strategy context requirements.
