# Architectural Decisions

Use this file for durable decisions with rationale and tradeoffs. Do not store temporary task noise, raw logs, secrets, or unverified assumptions.

## Entry Template

```yaml
memory_entry:
  id: "YYYY-MM-DD-decision-short-slug"
  date: "YYYY-MM-DD"
  type: "architectural_decision"
  source_task: ""
  content: ""
  evidence: []
  confidence: "low | medium | high"
  review_condition: ""
  duplicate_check: ""
  expiry_or_review_trigger: ""
```
