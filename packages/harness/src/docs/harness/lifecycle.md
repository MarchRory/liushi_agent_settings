# Harness Lifecycle Protocol

## Purpose

Lifecycle stages help the lead agent select only the process needed for the current task. Do not run every stage mechanically.

## Stage Contracts

```yaml
lifecycle_stages:
  context_recovery:
    entry_condition: "Relevant repository state, commands, or conventions are unknown."
    inputs:
      - user_goal
      - likely_paths_or_search_terms
    actions:
      - inspect_repository_root_and_metadata
      - search_focused_files
      - identify_commands_conventions_risks_unknowns
    output_artifact: context_summary
    exit_gate: "Relevant facts and unknowns are summarized with evidence."
    failure_mode: "If relevant context cannot be found, state unknowns and proceed only if safe."
    next_stage: task_modeling

  task_modeling:
    entry_condition: "Task is non-trivial or has ambiguous risk/scope."
    inputs:
      - user_goal
      - context_summary
    actions:
      - define_goal_current_state_constraints_success_criteria
      - classify_task_complexity
      - choose_minimum_workflow
    output_artifact: task_frame
    exit_gate: "Goal, scope, risks, and validation plan are clear enough to act."
    failure_mode: "Ask the user only when ambiguity blocks safe progress."
    next_stage: research_or_architecture_or_implementation

  research:
    entry_condition: "Correctness depends on recent, external, niche, or uncertain knowledge."
    inputs:
      - research_question
      - source_priority
    actions:
      - use_official_docs_or_primary_sources_first
      - compare_sources_when_claims_conflict
      - capture_uncertainty_and_dates
    output_artifact: research_summary
    exit_gate: "Findings are source-backed and project implications are clear."
    failure_mode: "Mark unsupported claims as uncertain; do not use them for high-risk decisions."
    next_stage: architecture_or_implementation

  architecture:
    entry_condition: "Task changes public interfaces, cross-module contracts, protocols, or durable structure."
    inputs:
      - task_frame
      - context_summary
      - research_summary
    actions:
      - compare_minimal_viable_designs
      - choose_interfaces_and_migration_path
      - identify_tests_and_compatibility_risks
    output_artifact: architecture_note
    exit_gate: "Interfaces, data flow, edge cases, and validation are decision-complete."
    failure_mode: "Reduce scope or ask if design choices remain high-impact and unresolved."
    next_stage: implementation

  implementation:
    entry_condition: "The change scope and validation target are clear."
    inputs:
      - task_frame
      - architecture_note
      - relevant_files
    actions:
      - edit_only_in_scope_files
      - preserve_unrelated_behavior
      - keep_diff_reviewable
    output_artifact: focused_diff
    exit_gate: "Changes match scope and are ready for validation."
    failure_mode: "Stop on blockers, repeated failures, or unexpected unrelated changes."
    next_stage: verification

  verification:
    entry_condition: "Meaningful files, behavior, configuration, or docs changed."
    inputs:
      - focused_diff
      - validation_plan
    actions:
      - run_narrowest_relevant_checks
      - parse_configs_when_configs_changed
      - record_not_run_reasons_when_checks_are_unavailable_or_unsafe
    output_artifact: validation_record
    exit_gate: "Validation evidence or explicit deferral is recorded."
    failure_mode: "Investigate failures before retrying; do not claim success."
    next_stage: critique

  critique:
    entry_condition: "There is regression risk, security risk, speculation, or multi-file change."
    inputs:
      - focused_diff
      - validation_record
      - task_frame
    actions:
      - review_scope_correctness_safety_and_maintainability
      - identify_missing_tests_or_unverified_risks
      - decide_accept_refine_or_stop
    output_artifact: critique_summary
    exit_gate: "Open issues are either fixed, accepted with rationale, or reported."
    failure_mode: "Return to implementation or verification for concrete issues."
    next_stage: delivery_or_refinement

  delivery:
    entry_condition: "Implementation, validation, and critique are complete enough to report."
    inputs:
      - focused_diff
      - validation_record
      - critique_summary
    actions:
      - summarize_changed_files
      - report_validation_evidence
      - state_assumptions_and_remaining_risks
    output_artifact: final_report
    exit_gate: "User can understand what changed and what remains uncertain."
    failure_mode: "If validation is incomplete, report it explicitly."
    next_stage: memory_update_if_needed

  memory_update:
    entry_condition: "A verified durable lesson, decision, convention, preference, or failure pattern was discovered."
    inputs:
      - final_report
      - evidence
    actions:
      - propose_memory_entry
      - check_duplicates
      - require_approval_or_trusted_memory_command_before_write
    output_artifact: memory_proposal_or_entry
    exit_gate: "Memory is either safely written or explicitly not written."
    failure_mode: "Reject noisy, secret-bearing, duplicated, or unverified entries."
    next_stage: complete
```

## Task Frame

```yaml
task:
  goal: ""
  background: ""
  current_state: ""
  expected_output: ""
  constraints: []
  success_criteria: []
  risks: []
  unknowns: []
  required_context: []
  validation_plan: []
```

## Completion Criteria

A complex task is ready for delivery only when:

- The user goal is addressed or the blocker is explicit.
- Relevant context was inspected.
- Changes, if any, are scoped.
- Validation was run or honestly deferred.
- Safety and memory gates were respected.
- Remaining risks and assumptions are stated.
