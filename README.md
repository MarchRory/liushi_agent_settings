# Agent Harness Starter

This branch provides a reusable Lead+Sub agent harness for Codex. It separates always-loaded root instructions from heavier lifecycle, memory, safety, orchestration, and evaluation protocols that agents load only when useful.

Claude Code support is intentionally split to the `release/claude-code-main` branch. Keep this branch Codex-focused.

## Structure

```txt
AGENTS.md                 # Short Codex lead-agent contract
.codex/config.toml        # Codex subagent limits
.codex/agents/*.toml      # Codex custom-agent definitions
.codex/agents/README.md   # Codex agent discovery layout guide
.codex/agents/<name>/*    # Sidecar docs/examples for each preset agent
.agents/skills/*          # Portable skill modules with references/examples
.harness/policies/*       # Safety, validation, and memory gates
.harness/manifest.yaml    # Machine-readable harness package manifest
.harness/memory/*         # Durable project memory templates
.harness/evals/*          # Reproducible harness eval definitions
docs/harness/*            # Detailed protocols and runtime notes
```

Each skill is a folder, not a single large prompt. The standard layout is:

```txt
.agents/skills/<skill-name>/
  SKILL.md                  # Lean trigger and navigation entrypoint
  agents/openai.yaml        # UI and invocation metadata
  references/*.md           # Detailed workflow and schema docs loaded as needed
  examples/*.yaml           # Compact reusable output examples
```

Keep `SKILL.md` concise. Put long procedures, schemas, examples, and future extensions in `references/` or `examples/`.

The built-in `multi-agent-orchestration` skill is the strategy entrypoint for Lead+Sub coordination. It keeps the strategy pool in TOML, uses read-only TypeScript/Node scripts to generate activation packets, and leaves final strategy startup to the lead agent. Run it through the skill-local npm scripts on Windows, macOS, and Linux.

Each Codex preset agent keeps its runtime-discoverable TOML at `.codex/agents/<name>.toml`. Do not move those files into subdirectories. Put expansion material in the matching sidecar directory:

```txt
.codex/agents/<agent-name>.toml
.codex/agents/<agent-name>/
  AGENT.md                    # Role profile and resource map
  references/workflow.md      # Detailed role workflow
  references/output-schema.md # Required specialist output schema
  examples/handoff.yaml       # Lead-to-agent handoff example
  examples/standard-output.yaml
```

Keep the TOML as the runtime entrypoint and the sidecar directory as the extensible documentation surface.

## Installation Modes

### Global Codex Mode

Use this when you want the harness available across projects.

1. Copy `AGENTS.md` into `~/.codex/`, or create a local `AGENTS.override.md` there if your Codex setup uses one.
2. Copy `.codex/agents/*.toml` and the matching `.codex/agents/<agent-name>/` sidecar directories into `~/.codex/agents/`.
3. Copy reusable skills into the Codex skill/plugin location used by your environment, or keep `.agents/skills/*` project-scoped.
4. Verify from a sample repository:

```powershell
codex --ask-for-approval never "Show which instruction files and custom agents are active."
codex debug prompt-input
```

Global instructions can be overridden by more specific project instructions where the runtime supports local precedence. Do not rely on global instructions for project-specific safety paths or commands.

## Manifest

The package manifest is `.harness/manifest.yaml`. It is machine-readable and records runtime entrypoints, Codex agent sidecar layout, skill modules, install targets, branch split rules, and verification commands.

Do not use a free-form `MANIFEST.txt`; manifests should be parseable by tools and stable enough for CI checks.

### Project-Scoped Mode

Use this when attaching the harness to one repository.

1. Copy this directory into the target project root.
2. Fill project commands only after inspecting package files, lockfiles, task runners, or docs.
3. Calibrate `.harness/policies/safety.yaml` for project-specific sensitive paths and domains.
4. Seed `.harness/memory/project-facts.md` only with verified facts.
5. Run one onboarding eval from `.harness/evals/tasks.yaml` before using the full harness on risky work.

Verification:

```powershell
codex --cd . --ask-for-approval never "Show which instruction files are active."
codex debug prompt-input
```

## Design Principles

- Keep `AGENTS.md` short because Codex loads root instructions into prompt context.
- Use runtime-specific adapters only for discovery and tool/sandbox configuration.
- Keep canonical workflows in `docs/harness/*`, `.agents/skills/*`, and `.harness/policies/*`.
- Treat subagent output as evidence for lead review, not as authority.
- Evaluate harness quality empirically before expanding process.
