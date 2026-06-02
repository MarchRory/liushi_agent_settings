# Codex Agent Directory

The root-level `*.toml` files in this directory are Codex custom-agent discovery entrypoints. Keep them directly under `.codex/agents/` or `~/.codex/agents/`.

Each agent also has a same-name sidecar directory:

```txt
.codex/agents/<agent-name>.toml
.codex/agents/<agent-name>/
  AGENT.md
  references/workflow.md
  references/output-schema.md
  examples/handoff.yaml
  examples/standard-output.yaml
```

Use the TOML file for runtime fields such as `name`, `description`, `sandbox_mode`, and `developer_instructions`. Use the sidecar directory for longer workflow docs, schemas, and examples.

Do not move the TOML files into the sidecar directories. That would make the layout cleaner visually but risks breaking runtime discovery.

## Production Role Depth

These agents are intended to behave like bounded software components, not generic personas. Each agent must expose:

- Runtime trigger conditions in the TOML `developer_instructions`.
- Clear "do not use" boundaries so the lead can avoid over-delegation.
- Evidence requirements for high-impact claims.
- A completion gate that defines when the specialist output is usable.
- Sidecar `AGENT.md` sections for production triggers, operating mode, role-specific playbooks, evidence requirements, handoff discipline, failure modes, and quality bar.
- A detailed `references/workflow.md` with intake, role procedure, evidence rules, escalation, refusal conditions, and completion checklist.

The static validator enforces this shape. If a role needs to evolve, edit the package source first, then run the root sync workflow.
