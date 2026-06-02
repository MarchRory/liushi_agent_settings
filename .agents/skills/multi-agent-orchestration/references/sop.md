# Strategy Activation SOP

## Lead Responsibilities

- Identify the strategy.
- Decide whether specialists are worth the coordination cost.
- Choose models at runtime and record the reason.
- Start specialists manually.
- Integrate outputs and own the final answer.

## Procedure

1. Summarize the task in one sentence.
2. List observed signals, risks, files or sources, and validation options.
3. Run `npm run select -- --context-file context.json` or a specific strategy script.
4. Inspect the activation packet.
5. Reject the packet if it over-delegates, misses a safety gate, or lacks evidence.
6. Fill model decision fields before starting specialists.
7. Send each specialist a scoped handoff.
8. Require `specialist_output`.
9. Resolve conflicts in a lead-owned integration record.
10. Report validation and remaining risk.

## Non-Negotiables

- Scripts never start agents.
- Subagents never start other strategies.
- Specialist output is evidence, not authority.
- High-risk work requires an approval record before action.

Use `references/platform-compatibility.md` for Windows and macOS command variants.
