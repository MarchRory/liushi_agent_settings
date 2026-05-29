# Multi-Agent Orchestration Workflow

## Procedure

1. Determine whether lead-only is sufficient.
2. Collect task signals in a small JSON context.
3. Add the lead's task decomposition in `lead_analysis` and `lead_strategy_reason`.
4. Add explicit evidence fields when they are naturally available; do not force rigid fields when a concise lead analysis captures the same decision.
5. Run `npm run select -- --context-file context.json` or the specific strategy script.
6. Review the activation packet before delegation.
7. Fill the runtime model decision record.
8. Start specialists manually with scoped handoffs.
9. Integrate outputs, resolve conflicts, validate, and report.

## Trust Boundary

The selector and strategy scripts are advisory. They never override direct user instructions, active runtime instructions, safety policies, or lead judgment.

## Stop Conditions

- The task is small enough for lead-only execution.
- A high-risk operation requires approval before strategy execution.
- The activation packet is missing required evidence or over-delegates.
- Specialist outputs conflict and the lead cannot resolve them from evidence.

## Platform Notes

Use Node.js 18+ and the skill-local npm scripts on Windows and macOS. Prefer `--context-file` over inline JSON when invoking from shells because quoting rules differ between PowerShell, Bash, and Zsh.
