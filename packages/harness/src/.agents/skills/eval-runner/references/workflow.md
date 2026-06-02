# Eval Runner Workflow

## Procedure

1. Identify the task id, configuration, fixture reference, and prompt.
2. Confirm allowed tools, expected artifacts, oracle checks, and validation commands.
3. Collect evidence: final response, changed files, commands, failures, trace summary, and memory proposals.
4. Score each rubric item on the configured 0.0 to 1.0 scale.
5. Apply the weighted formula from `.harness/evals/rubric.yaml`.
6. Explain failures, review-required items, and improvement opportunities.
7. Propose reusable lessons only when supported by evidence.

## Evidence Rules

- Do not score a criterion as complete without direct evidence.
- If fixture materialization is missing, mark the eval blocked or review-required.
- Keep cost metrics separate from quality scores.
