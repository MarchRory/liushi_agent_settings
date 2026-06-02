# Eval Runner Output Schema

```yaml
eval_record:
  task_id: ""
  configuration: ""
  fixture_ref: ""
  prompt: ""
  scores: {}
  weighted_score: 0.0
  commands_run: []
  artifacts: []
  trace_ref: ""
  failures: []
  lessons: []
  final_status: "pass | review_required | fail"
```

Scores must be numeric values from 0.0 to 1.0 unless the rubric explicitly says otherwise.
