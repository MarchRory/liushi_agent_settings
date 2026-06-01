# Code Review Output Schema

```yaml
review:
  summary: ""
  blocking_issues: []
  non_blocking_issues: []
  risks: []
  validation_gaps: []
  recommendation: "approve | revise | reject"
```

Each issue should include:

```yaml
issue:
  severity: "blocking | non_blocking"
  title: ""
  evidence: []
  impact: ""
  recommendation: ""
```
