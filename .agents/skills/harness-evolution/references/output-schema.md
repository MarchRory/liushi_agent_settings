# Harness Evolution Output Schema

```yaml
evolution_record:
  candidate_id: ""
  source: ""
  candidate_type: "context | memory | skill | agent | hook | eval | policy | docs"
  hypothesis: ""
  worthiness:
    evidence: 0.0
    expected_impact: 0.0
    measurability: 0.0
    safety: 0.0
    score: 0.0
  baseline:
    command_or_trace: ""
    result: ""
  before_after:
    same_fixture_or_trace: ""
    before_result: {}
    after_result: {}
    acceptance_threshold: ""
    cost_latency_bounds: ""
    regression_checks: []
  change_scope: []
  validation_plan: []
  metrics:
    before: {}
    after: {}
  safety_review:
    secrets: "absent | present | not_checked"
    untrusted_instruction_risk: "low | medium | high"
    rollback_trigger: ""
    rollback_verification: ""
  decision: "implement | reject | defer"
  rationale: ""
```

Do not mark a candidate `implement` when `worthiness.score < 0.75` unless the user explicitly directs it and the record explains the exception.
