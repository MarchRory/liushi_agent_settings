# Memory Update Output Schema

```yaml
memory_update:
  proposed_entries: []
  written_entries: []
  rejected_candidates: []
  duplicate_check: ""
  rationale: ""
```

Each memory entry must follow:

```yaml
memory_entry:
  id: ""
  date: ""
  type: "project_fact | architectural_decision | reusable_pattern | failure_pattern | user_preference | open_question"
  source_task: ""
  content: ""
  evidence: []
  source_trust: "direct_user | runtime_instruction | repo_evidence | validation_output | specialist_output | external_source"
  safety_review:
    secret_scan: "pass | fail | not_run"
    instruction_like_content: "absent | present_rejected | present_attack_pattern"
    raw_log_or_context_dump: "absent | present_rejected"
    redaction_summary: ""
  write_authorization:
    authorized: false
    source: ""
    exact_candidate_ids: []
    target_memory_file: ""
  supersedes: []
  confidence: "low | medium | high"
  review_condition: ""
  duplicate_check: ""
  expiry_or_review_trigger: ""
```
