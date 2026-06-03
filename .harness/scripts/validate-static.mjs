#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = findRepoRoot(scriptDir);
const harnessSource = join(repoRoot, "packages", "harness", "src");
const codexSource = join(repoRoot, "packages", "codex-config", "src");
const orchestrationRoot = join(harnessSource, ".agents", "skills", "multi-agent-orchestration");
const requireFromSkill = createRequire(join(orchestrationRoot, "package.json"));
const { parse: parseToml } = requireFromSkill("smol-toml");
const { parse: parseYaml } = requireFromSkill("yaml");

const failures = [];
const checks = {
  toml_files: 0,
  yaml_files: 0,
  skill_metadata_files: 0,
  codex_agent_files: 0,
  codex_agent_specificity_checks: 0,
  codex_agent_sidecar_specificity_checks: 0,
  codex_agent_runtime_depth_checks: 0,
  codex_agent_sidecar_depth_checks: 0,
  codex_agent_workflow_depth_checks: 0,
  codex_agent_role_specific_checks: 0,
  codex_hook_files: 0,
  codex_hook_event_checks: 0,
  codex_hook_test_files: 0,
  codex_hook_config_checks: 0,
  package_script_checks: 0,
  policy_shape_checks: 0,
  schema_files: 0,
  fixture_files: 0,
  eval_tasks: 0,
  governance_policy_checks: 0,
};

validateTomlFiles([
  join(codexSource, ".codex", "config.toml"),
  ...listFiles(join(codexSource, ".codex", "agents"), ".toml"),
  ...listFiles(join(orchestrationRoot, "references"), ".toml"),
]);
validateYamlFiles([
  join(harnessSource, ".harness", "manifest.yaml"),
  ...listFiles(join(harnessSource, ".harness", "policies"), ".yaml"),
  ...listFiles(join(harnessSource, ".harness", "evals"), ".yaml"),
  join(harnessSource, ".harness", "fixtures", "manifest.yaml"),
  ...listFiles(join(harnessSource, ".agents", "skills"), ".yaml"),
]);
validateSkillMetadata();
validateCodexAgents();
validateCodexHooks();
validatePackageScripts();
validateJsonSchemas();
validateFixtureFiles();
validateEvalTasks();
validateRubric();
validateGovernancePolicies();

console.log(JSON.stringify({ valid: failures.length === 0, checks, failures }, null, 2));
if (failures.length > 0) process.exit(1);

function validateTomlFiles(files) {
  for (const file of files) {
    checks.toml_files += 1;
    try {
      parseToml(readText(file));
    } catch (error) {
      failures.push(`${rel(file)}: invalid TOML: ${error.message}`);
    }
  }
}

function validateYamlFiles(files) {
  for (const file of files) {
    checks.yaml_files += 1;
    try {
      parseYaml(readText(file));
    } catch (error) {
      failures.push(`${rel(file)}: invalid YAML: ${error.message}`);
    }
  }
}

function validateSkillMetadata() {
  const skillRoots = listDirs(join(harnessSource, ".agents", "skills"));
  for (const skillRoot of skillRoots) {
    const skillPath = join(skillRoot, "SKILL.md");
    checks.skill_metadata_files += 1;
    if (!existsSync(skillPath)) {
      failures.push(`${rel(skillRoot)}: missing SKILL.md`);
      continue;
    }
    const metadata = parseFrontmatter(skillPath);
    if (!metadata) continue;
    if (metadata.name !== basename(skillRoot)) {
      failures.push(`${rel(skillPath)}: frontmatter name must match directory name`);
    }
    if (typeof metadata.description !== "string" || metadata.description.trim().length === 0) {
      failures.push(`${rel(skillPath)}: missing non-empty description`);
    } else if (metadata.description.length > 220) {
      failures.push(`${rel(skillPath)}: description is too long for reliable progressive disclosure`);
    }
    for (const required of ["agents/openai.yaml", "references/workflow.md", "references/output-schema.md", "examples/standard-output.yaml"]) {
      if (!existsSync(join(skillRoot, required))) failures.push(`${rel(skillRoot)}: missing ${required}`);
    }
  }
}

function validateCodexAgents() {
  const runtimeMarkers = [
    "Specialized lane:",
    "Trigger when:",
    "Do not use when:",
    "Reject / redirect:",
    "Sharp deliverables:",
    "Evidence requirements:",
    "Completion gate:",
  ];
  const sidecarMarkers = [
    "## Production Trigger Conditions",
    "## Specialized Lane",
    "## Reject / Redirect",
    "## Operating Mode",
    "## Role-Specific Playbooks",
    "## Evidence Requirements",
    "## Handoff Discipline",
    "## Failure Modes This Agent Is Designed To Catch",
    "## Sharp Deliverables",
    "## Quality Bar",
  ];
  const workflowMarkers = [
    "## Intake",
    "## Role Procedure",
    "## Evidence Rules",
    "## Handoff and Escalation",
    "## Refusal Conditions",
    "## Completion Checklist",
  ];
  const roleSpecificTerms = {
    architect: ["ADR", "compatibility matrix", "rollback surface"],
    "codebase-explorer": ["entry point inventory", "source-authoritative", "unknowns ledger"],
    critic: ["assumption ledger", "eval", "reversibility"],
    implementer: ["patch surgeon", "source/materialized", "sync/generation"],
    "memory-curator": ["authorization", "duplicate check", "sensitivity"],
    researcher: ["source ladder", "recency", "frontier"],
    reviewer: ["findings first", "severity", "validation coverage"],
    tester: ["claim-to-evidence", "exit status", "residual risk"],
  };

  for (const file of listFiles(join(codexSource, ".codex", "agents"), ".toml")) {
    checks.codex_agent_files += 1;
    const agent = parseToml(readText(file));
    const name = agent.name;
    if (typeof name !== "string" || name.length === 0) {
      failures.push(`${rel(file)}: missing agent name`);
      continue;
    }
    if (typeof agent.description !== "string" || agent.description.length === 0) {
      failures.push(`${rel(file)}: missing agent description`);
    }
    if (!["read-only", "workspace-write"].includes(agent.sandbox_mode)) {
      failures.push(`${rel(file)}: sandbox_mode must be read-only or workspace-write`);
    }
    if (typeof agent.developer_instructions !== "string" || agent.developer_instructions.length === 0) {
      failures.push(`${rel(file)}: missing developer_instructions`);
    } else {
      for (const marker of ["Specialized lane:", "Reject / redirect:", "Sharp deliverables:"]) {
        checks.codex_agent_specificity_checks += 1;
        if (!agent.developer_instructions.includes(marker)) {
          failures.push(`${rel(file)}: developer_instructions missing specificity marker ${marker}`);
        }
      }
      for (const marker of runtimeMarkers) {
        checks.codex_agent_runtime_depth_checks += 1;
        if (!agent.developer_instructions.includes(marker)) {
          failures.push(`${rel(file)}: developer_instructions missing runtime depth marker ${marker}`);
        }
      }
    }
    const sidecar = join(codexSource, ".codex", "agents", name);
    for (const required of ["AGENT.md", "references/workflow.md", "references/output-schema.md", "examples/handoff.yaml", "examples/standard-output.yaml"]) {
      if (!existsSync(join(sidecar, required))) failures.push(`${rel(sidecar)}: missing ${required}`);
    }
    const sidecarAgent = join(sidecar, "AGENT.md");
    if (existsSync(sidecarAgent)) {
      const sidecarText = readText(sidecarAgent);
      for (const marker of ["## Specialized Lane", "## Reject / Redirect", "## Sharp Deliverables"]) {
        checks.codex_agent_sidecar_specificity_checks += 1;
        if (!sidecarText.includes(marker)) {
          failures.push(`${rel(sidecarAgent)}: missing sidecar specificity section ${marker}`);
        }
      }
      for (const marker of sidecarMarkers) {
        checks.codex_agent_sidecar_depth_checks += 1;
        if (!sidecarText.includes(marker)) failures.push(`${rel(sidecarAgent)}: missing production depth section ${marker}`);
      }
      if (sidecarText.length < 4000) failures.push(`${rel(sidecarAgent)}: sidecar guidance is too short for production role depth`);
    }
    const workflowPath = join(sidecar, "references", "workflow.md");
    if (existsSync(workflowPath)) {
      const workflowText = readText(workflowPath);
      for (const marker of workflowMarkers) {
        checks.codex_agent_workflow_depth_checks += 1;
        if (!workflowText.includes(marker)) failures.push(`${rel(workflowPath)}: missing workflow depth section ${marker}`);
      }
      if (workflowText.length < 2500) failures.push(`${rel(workflowPath)}: workflow guidance is too short for production role depth`);
    }
    const combined = `${agent.developer_instructions ?? ""}\n${existsSync(sidecarAgent) ? readText(sidecarAgent) : ""}\n${
      existsSync(join(sidecar, "references", "workflow.md")) ? readText(join(sidecar, "references", "workflow.md")) : ""
    }`.toLowerCase();
    for (const term of roleSpecificTerms[name] ?? []) {
      checks.codex_agent_role_specific_checks += 1;
      if (!combined.includes(term.toLowerCase())) failures.push(`${rel(sidecar)}: missing role-specific production term ${term}`);
    }
  }
}

function validateCodexHooks() {
  const hooksPath = join(codexSource, ".codex", "hooks.json");
  checks.codex_hook_files += 1;
  const hooksConfig = readJson(hooksPath);
  if (!hooksConfig) return;
  const hooks = hooksConfig.hooks;
  if (!hooks || typeof hooks !== "object") {
    failures.push(`${rel(hooksPath)}: missing hooks object`);
    return;
  }
  for (const eventName of ["PreToolUse", "PermissionRequest", "SubagentStart", "SubagentStop", "Stop"]) {
    checks.codex_hook_event_checks += 1;
    if (!Array.isArray(hooks[eventName]) || hooks[eventName].length === 0) {
      failures.push(`${rel(hooksPath)}: missing hook event ${eventName}`);
      continue;
    }
    for (const entry of hooks[eventName]) {
      checks.codex_hook_config_checks += 1;
      if (!Array.isArray(entry.hooks) || entry.hooks.length === 0) failures.push(`${rel(hooksPath)}#${eventName}: hooks must be a non-empty array`);
      for (const hook of entry.hooks ?? []) {
        const prefix = `${rel(hooksPath)}#${eventName}`;
        for (const field of ["type", "command", "commandWindows", "timeout", "statusMessage"]) {
          checks.codex_hook_config_checks += 1;
          if (hook[field] === undefined || hook[field] === "") failures.push(`${prefix}: hook missing ${field}`);
        }
        if (hook.type !== "command") failures.push(`${prefix}: hook type must be command`);
        const scriptMatch = String(hook.command ?? "").match(/\.codex\/hooks\/([^"]+\.ts)/u);
        checks.codex_hook_config_checks += 1;
        if (!scriptMatch) {
          failures.push(`${prefix}: command must reference .codex/hooks/*.ts`);
        } else if (!existsSync(join(codexSource, ".codex", "hooks", scriptMatch[1]))) {
          failures.push(`${prefix}: command references missing hook script ${scriptMatch[1]}`);
        }
        const windowsScriptMatch = String(hook.commandWindows ?? "").match(/\.codex\/hooks\/([^'"]+\.ts)/u);
        checks.codex_hook_config_checks += 1;
        if (!windowsScriptMatch) {
          failures.push(`${prefix}: commandWindows must reference .codex/hooks/*.ts`);
        } else if (!existsSync(join(codexSource, ".codex", "hooks", windowsScriptMatch[1]))) {
          failures.push(`${prefix}: commandWindows references missing hook script ${windowsScriptMatch[1]}`);
        }
      }
    }
  }

  for (const required of [
    "lib/read-stdin-json.ts",
    "lib/policy-loader.ts",
    "lib/run-main.ts",
    "lib/types.ts",
    "lib/hook-response.ts",
    "lib/tool-classifier.ts",
    "lib/text-patterns.ts",
    "pre_tool_use_policy.ts",
    "permission_request_policy.ts",
    "subagent_start_context.ts",
    "subagent_stop_schema_gate.ts",
    "stop_validation_gate.ts",
  ]) {
    checks.codex_hook_files += 1;
    if (!existsSync(join(codexSource, ".codex", "hooks", required))) failures.push(`packages/codex-config/src/.codex/hooks: missing ${required}`);
  }
  if (existsSync(join(codexSource, ".codex", "hooks-src"))) failures.push("packages/codex-config/src/.codex/hooks-src: hooks-src is not allowed; use .codex/hooks TypeScript source only");
  for (const file of listFiles(join(codexSource, ".codex", "hooks"), ".mjs")) failures.push(`${rel(file)}: generated JavaScript hook runtime is not allowed`);

  for (const required of [
    "pre-tool-use-policy.test.ts",
    "permission-request-policy.test.ts",
    "subagent-start-context.test.ts",
    "subagent-stop-schema-gate.test.ts",
    "stop-validation-gate.test.ts",
    "installed-target-smoke.test.ts",
  ]) {
    checks.codex_hook_test_files += 1;
    if (!existsSync(join(repoRoot, "packages", "harness", "tests", "hooks", required))) failures.push(`packages/harness/tests/hooks: missing ${required}`);
  }

  validatePolicyShapeForHooks();
}

function validatePackageScripts() {
  const packageJson = readJson(join(repoRoot, "package.json"));
  const scripts = packageJson?.scripts ?? {};
  for (const required of ["check:hooks", "test:hooks", "validate"]) {
    checks.package_script_checks += 1;
    if (typeof scripts[required] !== "string" || scripts[required].length === 0) failures.push(`package.json: missing script ${required}`);
  }
  checks.package_script_checks += 1;
  if (!scripts.validate?.includes("npm run check:hooks")) failures.push("package.json: validate must include npm run check:hooks");
  checks.package_script_checks += 1;
  if (!scripts.validate?.includes("npm run test:hooks")) failures.push("package.json: validate must include npm run test:hooks");
  for (const requiredTest of [
    "pre-tool-use-policy.test.ts",
    "permission-request-policy.test.ts",
    "subagent-start-context.test.ts",
    "subagent-stop-schema-gate.test.ts",
    "stop-validation-gate.test.ts",
    "installed-target-smoke.test.ts",
  ]) {
    checks.package_script_checks += 1;
    if (!scripts["test:hooks"]?.includes(requiredTest)) failures.push(`package.json: test:hooks must run ${requiredTest}`);
  }
}

function validatePolicyShapeForHooks() {
  const safetyPath = join(harnessSource, ".harness", "policies", "safety.yaml");
  const safetyPolicy = readYaml(safetyPath)?.safety_policy;
  const safetyRequiredArrays = [
    "sensitive_paths",
    "sensitive_domains",
    "gates.preflight_required_for",
    "gates.blocked_without_approval",
    "gates.approval_record_required_fields",
    "destructive_command_patterns.filesystem",
    "destructive_command_patterns.git",
    "destructive_command_patterns.containers_and_cloud",
  ];
  for (const path of safetyRequiredArrays) {
    checks.policy_shape_checks += 1;
    if (!Array.isArray(getByPath(safetyPolicy, path)) || getByPath(safetyPolicy, path).length === 0) {
      failures.push(`${rel(safetyPath)}: missing non-empty ${path}`);
    }
  }

  const validationPath = join(harnessSource, ".harness", "policies", "validation.yaml");
  const validationPolicy = readYaml(validationPath)?.validation_policy;
  for (const path of [
    "default.after_code_change.mandatory_when_available",
    "default.after_documentation_change.mandatory_when_available",
    "default.after_config_change.mandatory_when_available",
    "gates.block_delivery_when",
    "gates.requires_override_record_when",
    "reporting.required_fields",
    "not_run_requires",
  ]) {
    checks.policy_shape_checks += 1;
    if (!Array.isArray(getByPath(validationPolicy, path)) || getByPath(validationPolicy, path).length === 0) {
      failures.push(`${rel(validationPath)}: missing non-empty ${path}`);
    }
  }
}

function validateJsonSchemas() {
  const schemasDir = join(orchestrationRoot, "schemas");
  for (const file of listFiles(schemasDir, ".json")) {
    checks.schema_files += 1;
    const schema = readJson(file);
    if (!schema) continue;
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") {
      failures.push(`${rel(file)}: schema must declare draft 2020-12`);
    }
    if (typeof schema.title !== "string" || schema.title.length === 0) {
      failures.push(`${rel(file)}: schema title is required`);
    }
  }
}

function validateFixtureFiles() {
  const fixturesDir = join(orchestrationRoot, "fixtures");
  const fixtureIds = new Set();
  for (const file of listFiles(fixturesDir, ".json")) {
    checks.fixture_files += 1;
    const fixture = readJson(file);
    if (!fixture) continue;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(fixture.id ?? "")) failures.push(`${rel(file)}: invalid fixture id`);
    if (fixtureIds.has(fixture.id)) failures.push(`${rel(file)}: duplicate fixture id ${fixture.id}`);
    fixtureIds.add(fixture.id);
    if (typeof fixture.description !== "string" || fixture.description.length === 0) failures.push(`${rel(file)}: missing description`);
    if (!fixture.input || typeof fixture.input !== "object") failures.push(`${rel(file)}: missing input object`);
    if (!fixture.expected || typeof fixture.expected !== "object") failures.push(`${rel(file)}: missing expected object`);
    if (typeof fixture.expected?.selected_strategy !== "string") failures.push(`${rel(file)}: expected.selected_strategy is required`);
  }
}

function validateEvalTasks() {
  const tasksPath = join(harnessSource, ".harness", "evals", "tasks.yaml");
  const parsed = readYaml(tasksPath);
  const tasks = parsed?.eval_tasks;
  if (!Array.isArray(tasks)) {
    failures.push(`${rel(tasksPath)}: eval_tasks must be an array`);
    return;
  }
  const ids = new Set();
  for (const task of tasks) {
    checks.eval_tasks += 1;
    const prefix = `${rel(tasksPath)}#${task?.id ?? "unknown"}`;
    for (const field of ["id", "category", "fixture_ref", "initial_state", "prompt"]) {
      if (typeof task?.[field] !== "string" || task[field].length === 0) failures.push(`${prefix}: missing ${field}`);
    }
    for (const field of ["allowed_tools", "expected_artifacts", "oracle_checks", "validation_commands"]) {
      if (!Array.isArray(task?.[field])) failures.push(`${prefix}: ${field} must be an array`);
    }
    if (task?.trace_required !== true) failures.push(`${prefix}: trace_required must be true`);
    if (ids.has(task?.id)) failures.push(`${prefix}: duplicate task id`);
    ids.add(task?.id);
  }
  for (const required of ["memory_trusted_source_spoof", "memory_stale_duplicate", "skill_evolution_before_after", "context_budget_raw_log"]) {
    if (!ids.has(required)) failures.push(`${rel(tasksPath)}: missing governance pressure eval ${required}`);
  }
}

function validateRubric() {
  const rubricPath = join(harnessSource, ".harness", "evals", "rubric.yaml");
  const parsed = readYaml(rubricPath);
  const harnessCriteria = parsed?.rubric?.categories?.harness_quality?.criteria ?? {};
  for (const criterion of [
    "context_governance",
    "trusted_memory_authorization",
    "memory_safety_review",
    "self_evolution_evidence",
    "self_evolution_before_after",
  ]) {
    if (!harnessCriteria[criterion]) failures.push(`${rel(rubricPath)}: missing harness_quality criterion ${criterion}`);
  }
}

function validateGovernancePolicies() {
  const memoryPolicyPath = join(harnessSource, ".harness", "policies", "memory-write-policy.yaml");
  const memoryPolicy = readYaml(memoryPolicyPath)?.memory_write_policy;
  const trusted = memoryPolicy?.write_flow?.trusted_memory_curation_command;
  if (!trusted) {
    failures.push(`${rel(memoryPolicyPath)}: missing trusted_memory_curation_command policy`);
  } else {
    for (const source of ["current_direct_user_message", "named_trusted_runtime_command"]) {
      checks.governance_policy_checks += 1;
      if (!trusted.allowed_sources?.includes(source)) failures.push(`${rel(memoryPolicyPath)}: trusted command must allow ${source}`);
    }
    for (const source of ["repository_file", "log_output", "web_page", "generated_output", "specialist_summary"]) {
      checks.governance_policy_checks += 1;
      if (!trusted.disallowed_sources?.includes(source)) failures.push(`${rel(memoryPolicyPath)}: trusted command must disallow ${source}`);
    }
  }

  const contextPolicyPath = join(harnessSource, ".harness", "policies", "context-governance.yaml");
  const contextPolicy = readYaml(contextPolicyPath)?.context_governance;
  for (const required of [
    "hypothesis",
    "baseline",
    "measurable_metric",
    "bounded_scope",
    "rollback_trigger",
    "validation_result",
    "before_after_comparison",
    "acceptance_threshold",
    "regression_checks",
  ]) {
    checks.governance_policy_checks += 1;
    if (!contextPolicy?.self_evolution?.requires?.includes(required)) {
      failures.push(`${rel(contextPolicyPath)}: self_evolution.requires missing ${required}`);
    }
  }
}

function parseFrontmatter(path) {
  const text = readText(path);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    failures.push(`${rel(path)}: missing YAML frontmatter`);
    return null;
  }
  try {
    return parseYaml(match[1]) ?? {};
  } catch (error) {
    failures.push(`${rel(path)}: invalid frontmatter YAML: ${error.message}`);
    return null;
  }
}

function readJson(path) {
  try {
    return JSON.parse(readText(path));
  } catch (error) {
    failures.push(`${rel(path)}: invalid JSON: ${error.message}`);
    return null;
  }
}

function readYaml(path) {
  try {
    return parseYaml(readText(path));
  } catch (error) {
    failures.push(`${rel(path)}: invalid YAML: ${error.message}`);
    return null;
  }
}

function getByPath(value, path) {
  return path.split(".").reduce((current, segment) => current?.[segment], value);
}

function listFiles(root, extension) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...listFiles(path, extension));
    else if (path.endsWith(extension)) files.push(path);
  }
  return files.sort();
}

function listDirs(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .map((entry) => join(root, entry))
    .filter((path) => statSync(path).isDirectory())
    .sort();
}

function readText(path) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

function rel(path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

function basename(path) {
  return path.split(/[\\/]/).pop();
}

function findRepoRoot(start) {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "packages", "harness"))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error(`could not find repository root from ${start}`);
    current = parent;
  }
}
