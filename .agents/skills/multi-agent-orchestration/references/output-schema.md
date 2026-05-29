# Activation Packet Schema

```json
{
  "schema_version": "1.0",
  "strategy_id": "",
  "strategy_name": "",
  "eligible": true,
  "score": 0.0,
  "confidence": "low | medium | high",
  "matched_signals": [],
  "missing_required_signals": [],
  "contraindication_hits": [],
  "lead_decision_required": true,
  "recommended_action": "lead_review_activation_packet | lead_decision_required_no_auto_selection",
  "task_summary": "",
  "candidate_agents": [],
  "max_agents": 0,
  "parallelism": "",
  "required_evidence": [],
  "missing_evidence": [],
  "stop_conditions": [],
  "validation_required": [],
  "handoff_skeletons": [
    {
      "from": "lead",
      "to": "",
      "role": "",
      "objective": "",
      "relevant_context": "",
      "files_or_sources": [],
      "constraints": [],
      "risks": [],
      "expected_output": "specialist_output",
      "validation_required": []
    }
  ],
  "model_decision_record": {
    "chosen_model": "",
    "reasoning_effort": "",
    "cost_risk": "",
    "why_this_model": "",
    "fallback_model": ""
  },
  "model_selection_hints": [],
  "script_contract": {
    "read_only": true,
    "network": false,
    "repo_mutation": false,
    "starts_agents": false
  }
}
```

The selector returns `no-eligible-strategy` instead of silently falling back when required signals or evidence are missing. The lead must review and may override the packet. Overrides require a reason in the final integration record.
