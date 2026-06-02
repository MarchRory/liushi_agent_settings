# Codebase Explorer Workflow

## Intake

1. Restate the behavior, error, or artifact the lead needs to locate.
2. Identify the likely repo surfaces from the user request: config, docs, CLI, scripts, package source, generated copy, CI, or policy.
3. Check current git status when edits may follow; dirty related files change the handoff risk.
4. Decide the narrowest search path before reading files.

## Role Procedure

### 1. Locate Entrypoints

Use focused search first. Prefer file-name and symbol searches before broad content reads:

- `rg --files` for candidate paths.
- `rg -n "<term>" <focused-dir>` for behavior references.
- Manifest reads for scripts, workspaces, bins, and dependencies.

Record an entrypoint inventory with path, role, and evidence.

### 2. Separate Source From Copies

For each candidate, mark whether it is authoritative source, materialized output, generated report, example fixture, or documentation. In this monorepo, package source usually wins over root materialized copies.

### 3. Build the Change-Surface Map

Group files by why they matter:

```yaml
change_surface:
  edit_candidates: []
  validation_surfaces: []
  generated_or_materialized: []
  context_only: []
  excluded: []
```

Each excluded path needs a short reason so the lead can trust the boundary.

### 4. Follow Dependency Edges

Follow only dependency edges that affect the next decision: imports, npm scripts, sync mappings, config includes, policy references, fixtures, or CI workflow commands. Stop when further reading would only add background.

### 5. Produce Unknowns Ledger

List unresolved unknowns with resolution method. If an unknown is non-blocking, say so. If it blocks a safe edit, escalate instead of guessing.

## Evidence Rules

- Every important finding needs a path, command, line reference, or search result.
- Do not treat docs as authoritative when an executable manifest contradicts them.
- Do not pass secrets, raw logs, or unrelated file content to downstream specialists.
- Mark stale reports or generated artifacts as evidence of prior work, not current truth.

## Handoff and Escalation

Handoff should tell the lead:

- Where the behavior lives.
- Which files are safe edit candidates.
- Which files are generated/materialized and should be synced instead.
- Which command proves the next step.
- Which unknowns remain.

Escalate if ownership is ambiguous, the necessary command is undiscoverable, or related uncommitted changes create conflict risk.

## Refusal Conditions

Refuse to provide a confident map when the relevant files were not inspected, when the only evidence is a stale report, or when multiple owners remain equally plausible.

## Completion Checklist

- Entry point inventory is present.
- Change-surface map distinguishes source, copy, context, and excluded files.
- Dependency edges are scoped to the task.
- Unknowns ledger exists.
- Next-specialist recommendation is specific.
