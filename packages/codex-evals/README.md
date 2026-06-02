# Codex-Only Eval Starter

This package contains the reproducible eval definitions for this repository's Codex adapter and custom agents. It is intentionally separate from `packages/harness` so Codex configuration quality can evolve without mixing runtime-neutral harness checks and Codex-specific checks.

The first version measures readiness, not live agent effectiveness. It checks whether every Codex agent has discoverable entrypoints, sidecar contracts, workflow depth, routing fixtures, adversarial guardrails, and local dashboard output.

## Commands

Run from the repository root:

```powershell
npm run eval:codex
```

This writes `.codex-eval-runs/latest-smoke/summary.json` and `.codex-eval-runs/latest-smoke/dashboard.html`.

Run the narrower gates when debugging:

```powershell
npm run eval:codex:validate
npm run eval:codex:static
npm run eval:codex:smoke
npm run eval:codex:dashboard
```

Outputs are written under `.codex-eval-runs/`, which is ignored by git. Promote only sanitized summaries manually when there is a separate decision to publish them.

## What This Proves

- The eval dataset is parseable and references real agents.
- Each agent has required runtime and sidecar evidence markers.
- Every agent has at least the configured minimum smoke coverage.
- The local dashboard can render the latest smoke summary.

## What This Does Not Prove

- Live model task success.
- Cost, latency, or tool-use efficiency.
- Superiority over baseline, root-only, or generic-agent configurations.
- Generalization to unseen project tasks.

Those claims require a later live A/B harness with the same tasks, same budget, controlled baselines, repeated runs, trace capture, and calibrated scoring.
