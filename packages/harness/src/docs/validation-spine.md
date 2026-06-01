# Validation Spine

The validation spine makes Codex harness changes measurable before they reach users. It checks configuration syntax, skill metadata, strategy registry integrity, deterministic strategy fixtures, activation-packet snapshots, and wrapper contracts.

## Run

From the repository root:

```powershell
npm run validate
```

This command installs the orchestration skill dependencies and runs:

- static TOML/YAML/JSON/frontmatter checks for harness configuration
- Codex agent sidecar layout checks
- TypeScript typecheck for `multi-agent-orchestration`
- strategy registry validation
- activation examples
- deterministic fixtures and snapshots
- per-strategy wrapper checks

For a faster static-only pass:

```powershell
npm run validate:static
```

## Quantitative Gates

The fixture runner reports these metrics:

```txt
fixture_pass_rate
strategy_selection_accuracy
required_field_pass_rate
snapshot_stability
```

Task 1 requires all four metrics to be `1.0`. A lower value means a strategy change needs either a fix or an intentional snapshot update.

## Add A Fixture

1. Add a JSON fixture under `.agents/skills/multi-agent-orchestration/fixtures/`.
2. Include `id`, `description`, `input`, and `expected.selected_strategy`.
3. Run `npm --prefix .agents/skills/multi-agent-orchestration run fixtures:update`.
4. Review the generated snapshot under `.agents/skills/multi-agent-orchestration/snapshots/`.
5. Run `npm run validate`.

Use fixtures for routing behavior that must stay stable, especially:

- small tasks must not over-delegate
- high-risk destructive tasks must enter the approval gate
- review/test tasks should not start broad debate panels
- architecture choices should expose accepted, rejected, and unresolved findings

## Add A Strategy

1. Add the strategy to `.agents/skills/multi-agent-orchestration/references/strategy-registry.toml`.
2. Add or update a model hint in `.agents/skills/multi-agent-orchestration/references/model-policy.toml`.
3. Add a read-only wrapper script under `.agents/skills/multi-agent-orchestration/scripts/strategies/`.
4. Add an activation example in `.agents/skills/multi-agent-orchestration/examples/strategy-activation-examples.yaml`.
5. Add a deterministic fixture and snapshot if the strategy affects default selection.
6. Run `npm run validate`.

Strategy scripts must only print activation packets. They must not start agents, mutate repositories, or access the network.
