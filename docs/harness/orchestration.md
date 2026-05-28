# Harness Orchestration Protocol

## Purpose

This document defines how the lead agent decomposes complex tasks and coordinates specialist agents without over-delegating.

## Principles

- Start lead-only.
- Add specialists only when a trigger matches.
- Use the smallest effective team.
- Keep specialist handoffs concrete and source-backed.
- Treat specialist output as evidence, not authority.
- The lead remains accountable for integration, safety, and final claims.

## Role Pools

These are optional role pools, not mandatory teams.

```yaml
role_pools:
  simple_task:
    default: [lead]
    max_specialists: 0

  codebase_investigation:
    candidates: [codebase-explorer, reviewer]
    max_specialists: 2

  feature_design:
    candidates: [researcher, architect, critic, reviewer]
    max_specialists: 3

  bug_fix:
    candidates: [codebase-explorer, implementer, tester, reviewer]
    max_specialists: 3

  harness_design:
    candidates: [researcher, architect, critic, memory-curator]
    max_specialists: 4

  security_sensitive_change:
    candidates: [codebase-explorer, architect, reviewer, tester, critic]
    max_specialists: 4
```

Small tasks should use lead-only or one specialist. Complex tasks should usually stay within three to four specialists unless the user explicitly asks for broader parallel review.

## Specialist Triggers

```yaml
specialist_triggers:
  researcher:
    use_when:
      - recent_external_knowledge_required
      - niche_or_fast_moving_topic
      - design_comparison_needed
    avoid_when:
      - answer_is_stable_and_known
      - user_explicitly_disallows_research

  codebase-explorer:
    use_when:
      - repository_structure_unknown
      - more_than_three_files_may_be_relevant
      - correct_edit_location_uncertain

  architect:
    use_when:
      - public_interface_changes
      - cross_module_change
      - new_protocol_or_abstraction

  implementer:
    use_when:
      - concrete_change_required

  reviewer:
    use_when:
      - code_modified
      - behavior_changed
      - security_or_data_integrity_touched
      - change_spans_multiple_files

  tester:
    use_when:
      - runtime_behavior_changed
      - regression_risk_exists
      - validation_commands_available

  critic:
    use_when:
      - assumptions_are_weak
      - solution_space_is_large
      - failure_cost_is_high

  memory-curator:
    use_when:
      - reusable_lesson_found
      - architectural_decision_made
      - verified_project_convention_found
```

## Handoff Contract

```yaml
handoff:
  from: "lead"
  to: ""
  role: ""
  objective: ""
  relevant_context: ""
  files_or_sources: []
  expected_output: ""
  constraints: []
  risks: []
  validation_required: []
```

## Specialist Output Contract

```yaml
specialist_output:
  role: ""
  summary: ""
  findings: []
  recommendations: []
  risks: []
  evidence: []
  confidence: "low | medium | high"
  confidence_basis: ""
  follow_up_needed: []
```

Findings that affect edits, safety, public interfaces, or memory must include evidence references. The lead should reject uncited claims for high-risk decisions.

## Codex Handoff Example

```yaml
handoff:
  from: "lead"
  to: "reviewer"
  role: "reviewer"
  objective: "Review the proposed diff for runtime adapter compatibility."
  relevant_context: "Codex custom agents require name, description, developer_instructions, and role-appropriate sandbox_mode."
  files_or_sources:
    - ".codex/agents/reviewer.toml"
    - "docs/harness/runtime-adapters.md"
  expected_output: "P0/P1/P2 findings with evidence and recommendations."
  constraints:
    - "Read-only review."
    - "Do not rely on uncited assumptions."
  risks:
    - "Runtime may not discover agents if schema is wrong."
  validation_required:
    - "Parse TOML."
```

## Integration Rule

```yaml
integration:
  accepted_findings: []
  rejected_findings: []
  conflicts: []
  final_decision: ""
  rationale: ""
```

Resolve conflicts explicitly. Do not let a specialist bypass lead review, validation, or safety gates.
