#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getPaths, loadEvalTasks, loadKnownAgents, nowIso, readJson, rel, validateJsonSchemaLite } from "./lib.mjs";

const TASK_REQUIRED_FIELDS = [
  "id",
  "suite",
  "category",
  "prompt",
  "expected_agents",
  "forbidden_agents",
  "acceptable_strategies",
  "rubric_ref",
  "must_include",
  "must_not_include",
  "target_surface",
  "claim_scope",
  "dataset_visibility",
];

const CATEGORIES = new Set(["routing", "per-agent", "adversarial"]);
const CLAIM_SCOPES = new Set(["readiness", "routing_oracle", "safety_regression", "live_ab_required"]);
const DATASET_VISIBILITIES = new Set(["visible_dev_set", "sealed_holdout"]);

export function validateDatasets(options = {}) {
  const paths = options.paths ?? getPaths(import.meta.url);
  const failures = [];
  const checks = {
    dataset_files: 0,
    task_records: 0,
    schema_files: 0,
    rubric_files: 0,
    schema_contract_checks: 0,
    schema_contract_passes: 0,
    known_agents: 0,
    role_references: 0,
    agent_references: 0,
    lead_only_cases: 0,
  };

  const taskSchemaPath = join(paths.schemasRoot, "codex-eval-task.schema.json");
  const summarySchemaPath = join(paths.schemasRoot, "codex-eval-summary.schema.json");
  let taskSchema = null;
  for (const schema of [taskSchemaPath, summarySchemaPath]) {
    checks.schema_files += 1;
    try {
      const parsed = readJson(schema);
      if (schema === taskSchemaPath) taskSchema = parsed;
      if (parsed.$schema !== "https://json-schema.org/draft/2020-12/schema") {
        failures.push(`${rel(paths.repoRoot, schema)}: schema must declare draft 2020-12`);
      }
      if (typeof parsed.title !== "string" || parsed.title.length === 0) {
        failures.push(`${rel(paths.repoRoot, schema)}: schema title is required`);
      }
    } catch (error) {
      failures.push(`${rel(paths.repoRoot, schema)}: invalid JSON schema: ${error.message}`);
    }
  }

  const rubricPath = join(paths.rubricsRoot, "roles.json");
  let rubric = null;
  checks.rubric_files += 1;
  try {
    rubric = readJson(rubricPath);
  } catch (error) {
    failures.push(`${rel(paths.repoRoot, rubricPath)}: invalid rubric JSON: ${error.message}`);
  }

  const agents = loadKnownAgents(paths);
  const agentNames = new Set(agents.map((agent) => agent.name));
  checks.known_agents = agentNames.size;
  const rubricRefs = new Set(Object.keys(rubric?.agents ?? {}));
  for (const agent of agentNames) {
    if (!rubricRefs.has(agent)) failures.push(`${rel(paths.repoRoot, rubricPath)}: missing rubric for agent ${agent}`);
  }
  if (!rubricRefs.has("lead-only")) failures.push(`${rel(paths.repoRoot, rubricPath)}: missing lead-only rubric`);

  const loaded = loadEvalTasks(paths);
  failures.push(...loaded.failures);
  checks.dataset_files = loaded.files.length;
  const ids = new Set();

  for (const { record: task, line, file } of loaded.tasks) {
    checks.task_records += 1;
    const prefix = `${rel(paths.repoRoot, file)}:${line}`;
    checks.schema_contract_checks += 1;
    const schemaFailures = taskSchema ? validateJsonSchemaLite(task, taskSchema, prefix) : [`${prefix}: task schema could not be loaded`];
    if (schemaFailures.length === 0) checks.schema_contract_passes += 1;
    else failures.push(...schemaFailures);
    for (const field of TASK_REQUIRED_FIELDS) {
      if (!(field in task)) failures.push(`${prefix}: missing ${field}`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(task.id ?? "")) failures.push(`${prefix}: invalid id`);
    if (ids.has(task.id)) failures.push(`${prefix}: duplicate id ${task.id}`);
    ids.add(task.id);
    if (!CATEGORIES.has(task.category)) failures.push(`${prefix}: invalid category ${task.category}`);
    if (!CLAIM_SCOPES.has(task.claim_scope)) failures.push(`${prefix}: invalid claim_scope ${task.claim_scope}`);
    if (!DATASET_VISIBILITIES.has(task.dataset_visibility)) {
      failures.push(`${prefix}: invalid dataset_visibility ${task.dataset_visibility}`);
    }
    if (task.dataset_visibility !== "visible_dev_set") {
      failures.push(`${prefix}: repository datasets must be marked visible_dev_set`);
    }
    if (task.target_surface !== ".codex") failures.push(`${prefix}: target_surface must be .codex`);
    if (typeof task.prompt !== "string" || task.prompt.length < 24) failures.push(`${prefix}: prompt is too short`);
    for (const field of ["expected_agents", "forbidden_agents", "acceptable_strategies", "must_include", "must_not_include"]) {
      if (!Array.isArray(task[field])) failures.push(`${prefix}: ${field} must be an array`);
    }
    if (Array.isArray(task.acceptable_strategies) && task.acceptable_strategies.length === 0) {
      failures.push(`${prefix}: acceptable_strategies must not be empty`);
    }
    if (Array.isArray(task.must_include) && task.must_include.length === 0) {
      failures.push(`${prefix}: must_include must not be empty`);
    }
    const expected = new Set(task.expected_agents ?? []);
    const forbidden = new Set(task.forbidden_agents ?? []);
    if (expected.size === 0) {
      checks.lead_only_cases += 1;
      if (!task.acceptable_strategies?.includes("lead-only-default")) {
        failures.push(`${prefix}: lead-only case must include lead-only-default strategy`);
      }
    }
    for (const agent of [...expected, ...forbidden]) {
      checks.agent_references += 1;
      if (!agentNames.has(agent)) failures.push(`${prefix}: unknown agent reference ${agent}`);
    }
    for (const agent of expected) {
      if (forbidden.has(agent)) failures.push(`${prefix}: expected and forbidden overlap for ${agent}`);
    }
    checks.role_references += 1;
    if (!rubricRefs.has(task.rubric_ref)) failures.push(`${prefix}: unknown rubric_ref ${task.rubric_ref}`);
    if (
      task.claim_scope !== "live_ab_required" &&
      /\b(write|claim|state|report)\b.*\b(proven|substantially better|live agent effectiveness)\b/i.test(task.prompt)
    ) {
      failures.push(`${prefix}: task that asks for a live-effectiveness claim must use live_ab_required claim_scope`);
    }
  }

  for (const file of loaded.files) {
    if (!existsSync(file)) failures.push(`${rel(paths.repoRoot, file)}: dataset file does not exist`);
  }

  return {
    run_type: "codex-only-dataset-validation-v0.1",
    timestamp: nowIso(),
    valid: failures.length === 0,
    checks,
    failures,
  };
}

function main() {
  const result = validateDatasets();
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exit(1);
}

if (process.argv[1]?.endsWith("validate-datasets.mjs")) main();
