# Strategy Playbooks

Use this file when a strategy packet is eligible but the handoff still feels too generic. Each strategy needs enough evidence before delegation; signals only nominate the strategy. Prefer explicit fields for repeatable checks, but concise `lead_analysis` and `lead_strategy_reason` are valid when the lead has already decomposed the task.

## lead-only-default

- Required explicit context: one-sentence task summary and low-risk reason.
- Use when: the lead can complete the task faster than coordinating specialists.
- Stop when: external research, high-risk scope, or independent work partitions appear.

## parallel-research-swarm

- Required explicit context: `source_list`, `source_priority`, `date_or_version_context`, `uncertainty_notes`.
- Handoff rule: split source families before starting specialists, such as official docs, papers, implementation examples, or risk review.
- Stop when: primary sources converge, conflict remains but is documented, or research budget is exhausted.

## supervisor-router

- Required explicit context: `routing_reason`, `agent_scope_boundaries`, `handoff_constraints`.
- Handoff rule: pick no more than `max_agents`; do not forward all candidate agents by default.
- Stop when: every route has an owner and the lead can integrate outputs.

## sop-assembly-line

- Required explicit context: `stage_plan`, `stage_exit_gates`, `validation_path`.
- Handoff rule: each stage output must become the next stage input.
- Stop when: a stage gate fails, scope changes, or validation cannot be performed.

## debate-critic-panel

- Required explicit context: `competing_options`, `decision_criteria`, `critique_questions`.
- Handoff rule: ask critics to attack assumptions and evidence, not to vote.
- Stop when: the lead can record accepted and rejected findings.

## reviewer-tester-loop

- Required explicit context: `diff_scope`, `validation_commands`, `review_scope`.
- Handoff rule: tester verifies behavior; reviewer searches for regressions, missing tests, and policy drift.
- Stop when: checks pass, a blocking finding appears, or retry budget is exhausted.

## batch-map-reduce

- Required explicit context: `item_partition`, `per_item_output_schema`, `reduce_rule`.
- Handoff rule: map agents receive disjoint item partitions and the same output schema.
- Stop when: coverage is complete or partitions conflict.

## selector-group-chat

- Required explicit context: `turn_budget`, `speaker_selection_rule`, `lead_checkpoint_rule`.
- Handoff rule: the lead selects the next speaker after each result; specialists do not self-route.
- Stop when: turn budget is hit, evidence stops improving, or the lead checkpoint requires a decision.

## human-approval-gate

- Required explicit context: `operation`, `target` or `files_or_sources`, `risk_statement` or `risks`, and `safer_alternative`.
- Approval record: risky action may proceed only when `approval_record` has `approved=true`, `approver_source`, exact matching operation/target, timestamp, and `risk_acknowledged=true`.
- Stop when: approval is denied, missing, mismatched, or a safer read-only path is available.
