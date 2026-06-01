# Runtime Adapters

## Purpose

This branch documents the Codex adapter for the harness. Claude Code-specific adapter files are maintained on `release/claude-code-main`.

## Common Layer

```txt
packages/harness/src/AGENTS.md
README.md
packages/harness/src/docs/harness/*
packages/harness/src/.harness/memory/*
packages/harness/src/.harness/evals/*
packages/harness/src/.harness/policies/*
packages/harness/src/.harness/manifest.yaml
packages/harness/src/.agents/skills/*
```

This layer contains shared operating principles, protocols, policies, skills, and durable state. Keep it runtime-neutral. The root copies are materialized with `npm run sync` for Codex discovery.

## Codex Layer

```txt
packages/codex-config/src/.codex/config.toml
packages/codex-config/src/.codex/agents/*.toml
packages/codex-config/src/.codex/agents/<agent-name>/*
```

Codex custom agents use TOML files with `name`, `description`, and `developer_instructions`. This repository also declares `sandbox_mode` per role:

- `read-only` for explorer, architect, critic, researcher, reviewer, tester, and memory-curator.
- `workspace-write` for implementer.

Recommended installation modes:

- Global: copy `AGENTS.md` to `~/.codex/`, or create a local `AGENTS.override.md` there if your Codex setup uses one. Copy `.codex/agents/*.toml` plus matching `.codex/agents/<agent-name>/` sidecar directories to `~/.codex/agents/`.
- Project-scoped: run `npm run sync` to materialize `AGENTS.md`, `.codex/config.toml`, `.codex/agents/*.toml`, and `.codex/agents/<agent-name>/` sidecar directories in the project root.

Do not move runtime TOML files into sidecar directories. The root-level `.toml` files are the discovery surface; same-name directories are for role workflows, schemas, and examples.

Verification:

```powershell
npm run check:sync
codex --ask-for-approval never "Show which instruction files and custom agents are active."
codex --cd . --ask-for-approval never "Show which instruction files are active."
codex debug prompt-input
npm run validate:static
```

`codex debug prompt-input` verifies prompt-loaded instructions. Custom-agent TOML files may be discovered by agent tooling rather than included directly in the root prompt.

## Conflict Behavior

Runtime-specific precedence differs, but use this harness rule consistently: project-local instructions and direct user task instructions should refine broader global defaults. Global configuration should never encode project-specific commands, sensitive paths, secrets, or deployment assumptions.

## Adapter Design Rule

Do not duplicate large protocols across runtime-specific files. Keep canonical protocols in `packages/harness/src/docs/harness`, `packages/harness/src/.agents/skills`, and `packages/harness/src/.harness/policies`, and keep adapters focused on discovery, tool access, sandboxing, and verification.
