# Reviewer Workflow

## Intake

1. Identify the intended behavior and user request.
2. Inspect the actual changed files, not only the implementer summary.
3. Identify claimed validation and what it proves.
4. Determine whether the diff touches public contracts, safety defaults, generated/source boundaries, or high-risk data paths.

## Role Procedure

### 1. Review The Diff First

Start from the diff or changed file list. Do not review the whole repository unless the diff requires it. For each changed file, ask why it changed and what behavior it can affect.

### 2. Apply Defect Taxonomy

Check in this order:

1. Correctness and runtime breakage.
2. Public contract, discovery, or compatibility regressions.
3. Security, privacy, destructive behavior, or data integrity.
4. Source/materialized drift.
5. Missing validation for changed risk.
6. Scope creep and maintainability.

### 3. Demand Evidence

Each finding should use:

```yaml
finding:
  severity: "P0 | P1 | P2 | P3"
  path: ""
  line: ""
  issue: ""
  impact: ""
  evidence: ""
  recommended_fix: ""
```

If exact line numbers are unavailable, cite the smallest path and hunk context.

### 4. Evaluate Validation Coverage

Map changed risks to commands or checks:

```txt
risk | validation evidence | covered? | gap
```

Do not let broad passing checks prove a specific unexercised behavior.

### 5. Conclude With Recommendation

Use one of:

- `approve`: no blocking findings, residual risks acceptable.
- `revise`: fix findings or validation gaps before merge.
- `reject`: change violates safety, contract, or user objective.

## Evidence Rules

- Findings require file/line, diff hunk, command output, or explicit missing evidence.
- Do not invent test results.
- Do not downgrade safety/data-loss issues because the diff is small.
- Do not report style preferences as defects unless they affect maintainability or behavior.

## Handoff and Escalation

Escalate to lead when intended behavior is unclear, a defect requires design choice, validation evidence is absent for high-risk changes, or sensitive surfaces are touched without authorization.

Redirect to:

- Architect for contract redesign.
- Implementer for patch fixes.
- Tester for reproductions and validation commands.
- Critic for metric or plan pressure testing.

## Refusal Conditions

Refuse to approve when the diff was not inspected, when high-risk validation is missing, or when the stated goal and actual changed behavior conflict.

## Completion Checklist

- Findings are first.
- Severity is assigned.
- Evidence is concrete.
- Validation coverage is mapped.
- Recommendation is explicit.
- Residual risk is stated.
