# Agent Harness Starter

此分支为 Codex 提供一个可复用的 Lead+Sub 代理脚手架。它将始终加载的根级指令与更重的生命周期、记忆、安全、编排和评估协议分离，后者仅在有用时才由代理加载。

Claude Code 支持有意拆分到了 `release/claude-code-main` 分支。请保持此分支以 Codex 为中心。

## Monorepo Source Model

此仓库是一个 npm workspaces monorepo。包源码是权威来源：

```txt
packages/harness/src/        # Runtime-neutral harness instructions, skills, policies, evals, and docs
packages/harness/scripts/    # Validation and live-model eval utilities
packages/codex-config/src/   # Codex adapter: .codex/config.toml and custom agents
packages/codex-evals/        # Codex adapter eval datasets, rubrics, schemas, and runners
```

根目录的 `AGENTS.md`、`.agents/`、`.harness/`、`.codex/` 和 `docs/harness/` 目录是已提交的物化副本，供 Codex 进行项目本地发现。请先编辑包源码，然后使用内部同步命令：

```powershell
npm run sync
npm run check:sync
```

内部同步故意保持严格：`npm run sync` 会写入根目录的物化文件，并删除根目录中不在包源码里的额外文件。这样可以保持仓库检出结果可复现。

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
packages/codex-evals/*    # Codex-only eval package, not a runtime source authority
```

每个 skill 都是一个文件夹，而不是一个大型单一提示。标准布局如下：

```txt
.agents/skills/<skill-name>/
  SKILL.md                  # Lean trigger and navigation entrypoint
  agents/openai.yaml        # UI and invocation metadata
  references/*.md           # Detailed workflow and schema docs loaded as needed
  examples/*.yaml           # Compact reusable output examples
```

保持 `SKILL.md` 简洁。把长流程、schema、示例和未来扩展放在 `references/` 或 `examples/` 中。

内置的 `multi-agent-orchestration` skill 是 Lead+Sub 协调的策略入口点。它将策略池保存在 TOML 中，使用只读的 TypeScript/Node 脚本生成激活包，并把最终的策略启动留给 lead 代理。请在 Windows、macOS 和 Linux 上通过 skill 本地的 npm scripts 运行它。

每个 Codex 预设代理都会把其运行时可发现的 TOML 保存在 `.codex/agents/<name>.toml`。不要把这些文件移动到子目录里。把扩展材料放到对应的 sidecar 目录中：

```txt
.codex/agents/<agent-name>.toml
.codex/agents/<agent-name>/
  AGENT.md                    # Role profile and resource map
  references/workflow.md      # Detailed role workflow
  references/output-schema.md # Required specialist output schema
  examples/handoff.yaml       # Lead-to-agent handoff example
  examples/standard-output.yaml
```

将 TOML 保持为运行时入口点，将 sidecar 目录作为可扩展的文档表面。

## Installation Modes

### Global Codex Mode

当你希望该脚手架可跨项目使用时，采用此模式。

1. 将 `AGENTS.md` 复制到 `~/.codex/`，如果你的 Codex 设置使用 `AGENTS.override.md`，也可以在那里创建一个本地文件。
2. 将 `.codex/agents/*.toml` 以及匹配的 `.codex/agents/<agent-name>/` sidecar 目录复制到 `~/.codex/agents/`。
3. 将可复用 skills 复制到你的环境所使用的 Codex skill/plugin 位置，或者保留 `.agents/skills/*` 为项目作用域。
4. 在一个示例仓库中验证：

```powershell
codex --ask-for-approval never "Show which instruction files and custom agents are active."
codex debug prompt-input
```

如果运行时支持本地优先级，更具体的项目指令可以覆盖全局指令。不要依赖全局指令来处理项目特定的安全路径或命令。

## Manifest

包清单是 `.harness/manifest.yaml`。它是机器可读的，并记录运行时入口点、Codex 代理 sidecar 布局、skill 模块、安装目标、分支拆分规则和验证命令。

不要使用自由格式的 `MANIFEST.txt`；清单应当可被工具解析，并且足够稳定，便于 CI 检查。

## Validation

在发布 harness 变更前，运行完整的确定性验证链：

```powershell
npm run validate
```

根命令首先检查物化的根文件是否与包源码一致，然后检查 TOML/YAML/JSON 语法、skill frontmatter、Codex 代理 sidecar 布局、TypeScript 类型安全、策略注册表完整性、激活示例、确定性 fixture、激活包快照以及包装器契约。

当前 Task 1 gate 是定量化的：

```txt
fixture_pass_rate = 1.0
strategy_selection_accuracy = 1.0
required_field_pass_rate = 1.0
snapshot_stability = 1.0
```

有关 fixture 和 strategy 扩展规则，请参见 `docs/validation-spine.md`。

### Codex-Only Agent Evals

当你要检查 Codex adapter 和自定义代理定义是否已准备好进行受控评估时，使用此模式：

```powershell
npm run eval:codex
```

这会在 `.codex-eval-runs/latest-smoke/` 下生成最新的确定性 smoke summary 和 dashboard。

在需要更窄的证据时，运行单独的 gate：

```powershell
npm run eval:codex:validate
npm run eval:codex:static
npm run eval:codex:smoke
npm run eval:codex:dashboard
```

这些命令是确定性的就绪 gate。它们验证数据集/schema 完整性、真实代理引用、每个代理的 fixture 覆盖率、运行时和 sidecar 标记、根目录/源码物化、anti-hype guardrail 以及 dashboard 渲染。`npm run validate` 也会运行非 dashboard 的 Codex eval gate，因此 CI 会保护评估机制。这些检查不能证明真实模型任务成功，也不能证明相对于基线更优。

生成的 eval 输出会放在 `.codex-eval-runs/` 下，并被 git 忽略。除非另有发布决定将经过净化的摘要提升为正式内容，否则请将原始 trace、dashboard 和报告保留在本地。

### Project-Scoped Mode

当将脚手架接入单个仓库时使用此模式。项目安装模式比内部同步更安全：

- `agent-harness sync` 默认是 dry-run，只报告计划中的变更而不会写入文件。
- 额外的目标文件默认会被保留；只有在你想要严格修剪时才传入 `--delete-extra=true`。
- `.agent-harnessignore` 会保护目标相对路径在 check/sync 中不受影响，包括严格修剪。
- `--overlay <dir>` 会在包源码之后应用目标相对的本地 overlay，因此无需编辑包源码也能管理本地项目选择。

1. 从 harness 检出目录预览安装：

```powershell
node packages/harness/bin/agent-harness.mjs sync --target <target-project> --adapter packages/codex-config
```

2. 在审阅 dry-run 后写入：

```powershell
node packages/harness/bin/agent-harness.mjs sync --write --target <target-project> --adapter packages/codex-config
```

3. 在目标项目中使用 `.agent-harnessignore` 保留本地扩展：

```gitignore
.agents/skills/local-only/
.codex/agents/local-*.toml
```

4. 使用 overlay 目录应用本地受管覆盖：

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

5. 只有在检查了包文件、lockfile、任务运行器或文档之后，才补充项目命令。
6. 根据项目特定的敏感路径和域名，调校 `.harness/policies/safety.yaml`。
7. 仅用经过验证的事实填充 `.harness/memory/project-facts.md`。
8. 在对高风险工作使用完整 harness 之前，先运行一个来自 `.harness/evals/tasks.yaml` 的 onboarding eval。

严格安装修剪是可选启用的：

```powershell
node packages/harness/bin/agent-harness.mjs sync --write --delete-extra=true --target <target-project> --adapter packages/codex-config
```

除非 `.agent-harnessignore` 已经保护了本地项目拥有的文件，否则不要使用严格修剪。

Verification:

```powershell
codex --cd . --ask-for-approval never "Show which instruction files are active."
codex debug prompt-input
```

## Design Principles

- 保持 `AGENTS.md` 简短，因为 Codex 会把根级指令加载到 prompt 上下文中。
- 仅使用运行时特定的 adapter 来做发现和工具/沙箱配置。
- 将权威工作流保存在 `docs/harness/*`、`.agents/skills/*` 和 `.harness/policies/*` 中。
- 将 subagent 输出视为供 lead 审阅的证据，而不是权威结论。
- 在扩展流程之前，先用实证方式评估 harness 质量。
- 用有来源支持的假设、可衡量的指标、受限的范围和回滚触发条件来治理 harness 的自我演化。
