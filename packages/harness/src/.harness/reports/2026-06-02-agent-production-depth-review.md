# Agent Production Depth Review

Date: 2026-06-02
Branch: `release/codex-main-en`

## Problem

The previous specialization pass made each Codex subagent less generic, but the sidecar `AGENT.md` and `references/workflow.md` files were still too close to role descriptions. They did not consistently encode trigger conditions, context discipline, role-specific playbooks, evidence requirements, refusal boundaries, completion gates, and failure modes.

That is not enough for production agent orchestration. A production subagent should behave like a bounded software component: clear routing, isolated context, explicit inputs, predictable outputs, measurable validation, and a handoff that the lead can compress into the next step.

## External Practice Inputs

The change synthesized these source classes:

- OpenAI Codex engineering practice: agent loops, tool mediation, safe local software changes, and reliability-oriented scaffolding.
  - Source: https://openai.com/index/unrolling-the-codex-agent-loop/
- Anthropic subagent and multi-agent practice: narrow subagents, separate context windows, orchestrator/worker coordination, and task-dependent cost/quality tradeoffs.
  - Source: https://docs.anthropic.com/en/docs/claude-code/sub-agents
  - Source: https://www.anthropic.com/engineering/multi-agent-research-system
- Frontier practitioner framing: context engineering and autonomy sliders should be treated as engineering surfaces, not prompt decoration.
  - Source: Andrej Karpathy, Software Is Changing Again, Y Combinator transcript mirror: https://rosetta.to/u/ycombinator/andrej-karpathy-software-is-changing-again
  - Source: LangChain context engineering synthesis: https://www.langchain.com/blog/context-engineering
- Open-source agent catalogs and examples: strong subagents are named by failure mode and use case, not just broad job title.
  - Source: https://github.com/contains-studio/agents
  - Source: https://github.com/VoltAgent/awesome-claude-code-subagents
- Academic agent work: agent-computer interfaces, reflection loops, and external feedback improve coding agents only when tied to executable environment signals.
  - Source: SWE-agent, Agent-Computer Interfaces Enable Automated Software Engineering: https://papers.nips.cc/paper_files/paper/2024/hash/5a7c947568c1b1328ccc5230172e1e7c-Abstract-Conference.html
  - Source: Reflexion, Language Agents with Verbal Reinforcement Learning: https://arxiv.org/abs/2303.11366

## Adopted Design Rules

Each production agent must now expose:

1. `Production Trigger Conditions`: when the lead should use the agent and when not to.
2. `Operating Mode`: how the agent should think differently from adjacent roles.
3. `Role-Specific Playbooks`: concrete procedures, not generic workflow bullets.
4. `Evidence Requirements`: what evidence must back high-impact claims.
5. `Handoff Discipline`: what the lead can safely reuse.
6. `Failure Modes This Agent Is Designed To Catch`: why this role exists.
7. `Quality Bar`: when the output is production-grade.

Runtime TOML instructions also gained:

- `Trigger when`
- `Do not use when`
- `Evidence requirements`
- `Completion gate`

This makes the core routing behavior visible even before Codex expands sidecar material.

## Role Depth Changes

- `codebase-explorer`: now a repository cartographer with entrypoint inventory, change-surface map, dependency-edge scan, and unknowns ledger.
- `architect`: now an ADR-style boundary designer with compatibility matrix, migration sequence, validation design, and rollback surface.
- `implementer`: now a patch surgeon with source/materialized classification, minimal-diff discipline, generated-copy handling, and failure recovery.
- `tester`: now a claim-to-evidence mapper with narrow validation selection, failure classification, and residual-risk reporting.
- `reviewer`: now a defect classifier with correctness, contract, safety, data-integrity, regression, validation-gap, and scope-creep taxonomy.
- `critic`: now an adversarial pressure tester with assumption ledger, eval integrity challenge, reversibility challenge, context-poisoning challenge, and delegation failure challenge.
- `researcher`: now a source-ladder researcher that combines official docs, primary posts, papers, active OSS, practitioner commentary, and local validation implications.
- `memory-curator`: now a memory admission controller with authorization, duplicate, sensitivity, durability, and review-trigger gates.

## Measurement

Static validation now enforces production depth, not just marker presence:

```txt
codex_agent_runtime_depth_checks = 56
codex_agent_sidecar_depth_checks = 80
codex_agent_workflow_depth_checks = 48
codex_agent_role_specific_checks = 24
```

These checks cover:

- 8 agents x 7 runtime TOML depth markers.
- 8 agents x 10 sidecar production sections.
- 8 agents x 6 workflow production sections.
- 8 agents x 3 role-specific terms.

Minimum depth thresholds:

- Each `AGENT.md` must be at least 4000 characters.
- Each `references/workflow.md` must be at least 2500 characters.

The length threshold is not treated as quality by itself; it prevents trivial title stuffing and is paired with role-specific term checks.

## Validation Plan

Required deterministic gates:

- `npm run check:sync`
- `npm run validate:static`
- `npm run validate:orchestration`
- `npm run validate`

When npm is unavailable in the host PATH, run static validation through the bundled Node runtime:

```txt
C:\Users\22877\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe packages\harness\scripts\validate-static.mjs
```

## Rollback Trigger

Rollback or revise if:

- The stronger role gates block legitimate agent definitions without improving delegation quality.
- Live or deterministic evals show worse task completion, higher role confusion, or excessive delegation.
- Codex fails to load TOML agent definitions after the runtime instruction expansion.
- The agent guidance becomes too verbose for practical sidecar expansion and should be split into skills or references.
