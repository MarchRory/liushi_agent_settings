#!/usr/bin/env node
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const orchestrationRoot = join(repoRoot, ".agents", "skills", "multi-agent-orchestration");
const requireFromSkill = createRequire(join(orchestrationRoot, "package.json"));
const { parse: parseToml } = requireFromSkill("smol-toml");
const { parse: parseYaml } = requireFromSkill("yaml");

const failures = [];
const checks = {
  toml_files: 0,
  yaml_files: 0,
  skill_metadata_files: 0,
  codex_agent_files: 0,
  schema_files: 0,
  fixture_files: 0,
  eval_tasks: 0,
  governance_policy_checks: 0,
};

validateTomlFiles([
  join(repoRoot, ".codex", "config.toml"),
  ...listFiles(join(repoRoot, ".codex", "agents"), ".toml"),
  ...listFiles(join(orchestrationRoot, "references"), ".toml"),
]);
validateYamlFiles([
  join(repoRoot, ".harness", "manifest.yaml"),
  ...listFiles(join(repoRoot, ".harness", "policies"), ".yaml"),
  ...listFiles(join(repoRoot, ".harness", "evals"), ".yaml"),
  join(repoRoot, ".harness", "fixtures", "manifest.yaml"),
  ...listFiles(join(repoRoot, ".agents", "skills"), ".yaml"),
]);
validateSkillMetadata();
validateCodexAgents();
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
  const skillRoots = listDirs(join(repoRoot, ".agents", "skills"));
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
  for (const file of listFiles(join(repoRoot, ".codex", "agents"), ".toml")) {
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
    const sidecar = join(repoRoot, ".codex", "agents", name);
    for (const required of ["AGENT.md", "references/workflow.md", "references/output-schema.md", "examples/handoff.yaml", "examples/standard-output.yaml"]) {
      if (!existsSync(join(sidecar, required))) failures.push(`${rel(sidecar)}: missing ${required}`);
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
  const tasksPath = join(repoRoot, ".harness", "evals", "tasks.yaml");
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
  const rubricPath = join(repoRoot, ".harness", "evals", "rubric.yaml");
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
  const memoryPolicyPath = join(repoRoot, ".harness", "policies", "memory-write-policy.yaml");
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

  const contextPolicyPath = join(repoRoot, ".harness", "policies", "context-governance.yaml");
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
