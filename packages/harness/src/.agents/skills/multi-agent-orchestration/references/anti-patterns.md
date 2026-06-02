# Multi-Agent Anti-Patterns

- Over-delegation: using specialists for small local tasks.
- Duplicate exploration: multiple agents reading the same files for the same question.
- Unbounded debate: critic loops without new evidence or a lead decision.
- Subagent self-authorization: a specialist expands scope or starts a new strategy.
- Tool mismatch: giving write-capable work to read-only roles or broad tools to review roles.
- Missing reducer: parallel results are reported without lead synthesis.
- No validation path: implementation proceeds without a planned check or explicit deferral.
- Hidden model choice: stronger or weaker models are selected without a recorded reason.
- Safety bypass: high-risk work starts before approval target, operation, risk, and safer alternative are recorded.
