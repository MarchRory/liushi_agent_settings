# Research and Industry Basis

This skill intentionally combines LLM-led judgment with deterministic code checks. The scripts do not prove that a multi-agent strategy is globally optimal; they make activation auditable, reproducible, and easier to evaluate.

## Implementation Basis

- OpenAI Codex supports specialized subagents, explicit spawning, custom agent instructions, and higher token cost for subagent workflows: https://developers.openai.com/codex/subagents
- OpenAI Codex Skills are reusable workflow packages with instructions, resources, and optional scripts loaded through progressive disclosure: https://developers.openai.com/codex/skills
- OpenAI Agents SDK for TypeScript distinguishes LLM orchestration from code orchestration and documents manager agents, handoffs, chains, evaluator loops, and parallel execution as core orchestration patterns: https://openai.github.io/openai-agents-js/guides/multi-agent/
- OpenAI agent eval guidance recommends traces, graders, datasets, and eval runs for workflow-level regressions such as wrong tool choice, wrong handoff, or policy violations: https://developers.openai.com/api/docs/guides/agent-evals
- Anthropic's production multi-agent research system uses a lead agent with parallel specialized subagents, clear subtask descriptions, effort scaling, source-quality heuristics, and eval loops; it also warns that many coding tasks are less parallelizable and that multi-agent systems can cost far more tokens: https://www.anthropic.com/engineering/multi-agent-research-system
- Microsoft AutoGen documents selector group chat, model-based speaker selection, agent descriptions, termination conditions, and custom selection functions: https://microsoft.github.io/autogen/stable/user-guide/agentchat-user-guide/selector-group-chat.html

## Academic and Open-Source Basis

- CAMEL studies role-playing communicative agents for autonomous cooperation and instruction-following in multi-agent settings: https://arxiv.org/abs/2303.17760
- Multiagent Debate studies multiple model instances proposing and debating answers to improve factuality and reasoning: https://arxiv.org/abs/2305.14325
- ChatDev applies communicative agents to software development roles and staged collaboration: https://arxiv.org/abs/2307.07924
- MetaGPT uses SOP-style role collaboration for multi-agent software workflows: https://arxiv.org/abs/2308.00352
- AgentVerse explores multi-agent collaboration and emergent behavior across task-solving settings: https://arxiv.org/abs/2308.10848

## Strategy Mapping

| Strategy | Main source pattern | Use with care because |
| --- | --- | --- |
| `lead-only-default` | Anthropic cost and parallelization warnings; Codex explicit spawning rule | Most engineering tasks do not justify coordination overhead. |
| `parallel-research-swarm` | Anthropic lead researcher with parallel subagents; Codex parallel subagents | Works best for breadth-first research with independent directions and clear source criteria. |
| `supervisor-router` | OpenAI Agents SDK manager/triage/handoff patterns | Routing adds value only when domain or permission boundaries are real. |
| `sop-assembly-line` | MetaGPT, ChatDev, staged code orchestration | Sequential stages can become ceremony unless exit gates and validation are explicit. |
| `debate-critic-panel` | Multiagent Debate; critic/reviewer patterns | Debate must end with lead arbitration and evidence, not endless opinion exchange. |
| `reviewer-tester-loop` | OpenAI evaluator loop; standard software QA | Loop budget and validation commands are required to avoid infinite retry. |
| `batch-map-reduce` | Parallel execution and reduction patterns from agent orchestration and distributed work | Partitions must be independent and reduction criteria must be explicit. |
| `selector-group-chat` | AutoGen SelectorGroupChat | Needs strict turn budget and lead checkpoints; otherwise routing can wander. |
| `human-approval-gate` | Agents SDK guardrails and human-in-the-loop; Codex approval/security model | Gate is not an execution strategy; it blocks risky work until exact approval exists. |

## Evaluation Requirements

Treat these strategies as hypotheses until measured on local tasks. Minimum evidence for claiming improvement:

- Strategy activation accuracy on fixtures.
- Over-delegation rate compared with lead-only.
- Handoff completeness.
- Validation completeness.
- Token and wall-clock cost.
- Final answer or artifact quality.

Do not claim that the skill improves intelligence by itself. Claim only that it improves orchestration discipline when activation packets, specialist outputs, and validation traces show better outcomes than a baseline.
