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
  confidence: "low | medium | high"
  review_condition: ""
  duplicate_check: ""
  expiry_or_review_trigger: ""
```
