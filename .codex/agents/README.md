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
