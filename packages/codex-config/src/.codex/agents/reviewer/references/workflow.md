# Reviewer Workflow

1. Identify intended behavior, changed surface, and validation evidence claimed by the lead or diff.
2. Inspect the diff for user-impacting defects first: runtime incompatibility, broken contracts, unsafe behavior, data integrity, missing required validation, and regressions.
3. Check scope control and local convention only after correctness and safety.
4. Report findings first, ordered by severity, with file/line or command evidence.
5. Separate blocking issues, non-blocking issues, risks, and validation gaps.
6. End with a recommendation: approve, revise, or reject.

Do not approve changes solely because they look plausible or because unrelated tests are green.
