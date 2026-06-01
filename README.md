# Agent Harness Starter

This branch provides a reusable Lead+Sub agent harness for Codex. It separates always-loaded root instructions from heavier lifecycle, memory, safety, orchestration, and evaluation protocols that agents load only when useful.

Claude Code support is intentionally split to the `release/claude-code-main` branch. Keep this branch Codex-focused.

## Monorepo Source Model

This repository is an npm workspaces monorepo. Package sources are authoritative:

```txt
packages/harness/src/        # Runtime-neutral harness instructions, skills, policies, evals, and docs
packages/harness/scripts/    # Validation and live-model eval utilities
packages/codex-config/src/   # Codex adapter: .codex/config.toml and custom agents
```

The root `AGENTS.md`, `.agents/`, `.harness/`, `.codex/`, and `docs/harness/` directories are materialized copies committed for Codex project-local discovery. Edit the package source first, then use the internal sync commands:

```powershell
npm run sync
npm run check:sync
```

Internal sync is intentionally strict: `npm run sync` writes root materialized files and deletes root extras that are not present in package source. This keeps the repository checkout reproducible.

## Structure

```txt
AGENTS.md                 # Short Codex lead-agent contract
.codex/config.toml        # Codex subagent limits
.codex/agents/*.toml      # Codex custom-agent definitions
.codex/agents/README.md   # Codex agent discovery layout guide
.codex/agents/<name>/*    # Sidecar docs/examples for each preset agent
.agents/skills/*          # Portable skill modules with references/examples
.harness/policies/*       # Safety, validation, and memory gates
.harness/policies/context-governance.yaml # Context, memory, and self-evolution gates
.harness/manifest.yaml    # Machine-readable harness package manifest
.harness/memory/*         # Durable project memory templates
.harness/evals/*          # Reproducible harness eval definitions
docs/harness/*            # Detailed protocols and runtime notes
packages/harness/*        # Source-authoritative harness package
packages/codex-config/*   # Source-authoritative Codex adapter package
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

## Validation

Run the full deterministic validation spine before publishing harness changes:

```powershell
npm run validate
```

The root command first checks that materialized root files match package sources, then checks TOML/YAML/JSON syntax, skill frontmatter, Codex agent sidecar layout, TypeScript type safety, strategy registry integrity, activation examples, deterministic fixtures, activation-packet snapshots, and wrapper contracts.

The current Task 1 gate is quantitative:

```txt
fixture_pass_rate = 1.0
strategy_selection_accuracy = 1.0
required_field_pass_rate = 1.0
snapshot_stability = 1.0
```

See `docs/validation-spine.md` for fixture and strategy extension rules.

### Project-Scoped Mode

Use this when attaching the harness to one repository. Project install mode is safer than internal sync:

- `agent-harness sync` is a dry-run by default and reports planned changes without writing files.
- Extra target files are preserved by default; pass `--delete-extra=true` only when you want strict pruning.
- `.agent-harnessignore` protects target-relative local paths from check/sync, including strict pruning.
- `--overlay <dir>` applies a target-relative local overlay after package sources, so local project choices can be managed without editing package source.

1. Preview the install from the harness checkout:

```powershell
node packages/harness/bin/agent-harness.mjs sync --target <target-project> --adapter packages/codex-config
```

2. Write after reviewing the dry-run:

```powershell
node packages/harness/bin/agent-harness.mjs sync --write --target <target-project> --adapter packages/codex-config
```

3. Preserve local extensions with `.agent-harnessignore` in the target project:

```gitignore
.agents/skills/local-only/
.codex/agents/local-*.toml
```

4. Apply local managed overrides with an overlay directory:

```txt
my-overlay/
  AGENTS.md
  .agents/skills/project-review/SKILL.md
  .codex/agents/project-reviewer.toml
```

```powershell
node packages/harness/bin/agent-harness.mjs sync --write --overlay my-overlay --target <target-project> --adapter packages/codex-config
node packages/harness/bin/agent-harness.mjs check --overlay my-overlay --target <target-project> --adapter packages/codex-config
```

5. Fill project commands only after inspecting package files, lockfiles, task runners, or docs.
6. Calibrate `.harness/policies/safety.yaml` for project-specific sensitive paths and domains.
7. Seed `.harness/memory/project-facts.md` only with verified facts.
8. Run one onboarding eval from `.harness/evals/tasks.yaml` before using the full harness on risky work.

Strict install pruning is opt-in:

```powershell
node packages/harness/bin/agent-harness.mjs sync --write --delete-extra=true --target <target-project> --adapter packages/codex-config
```

Do not use strict pruning unless `.agent-harnessignore` already protects local project-owned files.

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
- Govern harness self-evolution with source-backed hypotheses, measurable metrics, bounded scope, and rollback triggers.
