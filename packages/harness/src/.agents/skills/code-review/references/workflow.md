# Code Review Workflow

## Review Order

1. Identify the user goal and intended behavior.
2. Inspect the changed files or proposed diff.
3. Check correctness, safety, data integrity, public interfaces, and regression risk.
4. Check whether validation evidence supports the claims.
5. Report findings by severity before summaries or praise.

## Severity

- `blocking`: likely incorrect behavior, unsafe action, schema/runtime incompatibility, data loss, security issue, or missing required validation gate.
- `non_blocking`: maintainability, clarity, incomplete docs, or test gaps that do not block use.
- `risk`: residual uncertainty, unverified behavior, or assumptions needing follow-up.

## Evidence Rules

- Cite file paths, line numbers, command output, or source links where available.
- Do not invent test results or runtime behavior.
- Treat specialist reports as evidence for review, not as authority.

## Recommendation

Use `revise` when blocking issues exist. Use `approve` only when the reviewed scope satisfies the user goal and validation evidence is adequate. Use `reject` when the approach is fundamentally wrong or unsafe.
