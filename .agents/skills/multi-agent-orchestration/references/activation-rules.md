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
