#!/usr/bin/env node
import { join } from "node:path";
import { assertSafeOutputTarget, getPaths, readJson, validateJsonSchemaLite } from "./lib.mjs";

const paths = getPaths(import.meta.url);
const failures = [];
const checks = [];

check("safe output target accepts ignored eval run path", () => {
  assertSafeOutputTarget(paths, join(paths.repoRoot, ".codex-eval-runs", "self-test", "summary.json"));
});

check("safe output target rejects tracked temp path", () => {
  expectThrow(() => assertSafeOutputTarget(paths, join(paths.repoRoot, "temp-eval-output")));
});

check("safe output target rejects path outside repository", () => {
  expectThrow(() => assertSafeOutputTarget(paths, join(paths.repoRoot, "..", "outside-eval-output")));
});

const taskSchema = readJson(join(paths.schemasRoot, "codex-eval-task.schema.json"));
const validTask = {
  id: "self-test-valid-task",
  suite: "self-test",
  category: "routing",
  prompt: "Route this synthetic task to a known agent with enough evidence.",
  expected_agents: ["tester"],
  forbidden_agents: ["implementer"],
  acceptable_strategies: ["single-specialist"],
  rubric_ref: "tester",
  must_include: ["evidence"],
  must_not_include: ["unrun test passed"],
  target_surface: ".codex",
  claim_scope: "routing_oracle",
  dataset_visibility: "visible_dev_set",
};

check("task schema accepts valid task shape", () => {
  expectNoSchemaFailure(validateJsonSchemaLite(validTask, taskSchema, "validTask"));
});

check("task schema rejects missing required field", () => {
  const badTask = { ...validTask };
  delete badTask.prompt;
  expectSchemaFailure(validateJsonSchemaLite(badTask, taskSchema, "missingPrompt"), "missing required property prompt");
});

check("task schema rejects unknown additional property", () => {
  const badTask = { ...validTask, extra: true };
  expectSchemaFailure(validateJsonSchemaLite(badTask, taskSchema, "extraField"), "unexpected property extra");
});

check("task schema rejects invalid enum value", () => {
  const badTask = { ...validTask, claim_scope: "agent_effectiveness_passed" };
  expectSchemaFailure(validateJsonSchemaLite(badTask, taskSchema, "badClaimScope"), "expected one of");
});

const summarySchema = readJson(join(paths.schemasRoot, "codex-eval-summary.schema.json"));
const validSummary = {
  run_type: "self-test-summary",
  timestamp: "2026-06-03T00:00:00.000Z",
  configuration: "packages/codex-config/src/.codex",
  evaluated_surface: ".codex",
  claim_scope: "deterministic_readiness_only",
  dataset_visibility: "visible_dev_set",
  live_model_used: false,
  llm_judge: "disabled",
  output_policy: {
    generated_outputs_ignored: true,
    default_output_dir: ".codex-eval-runs/",
    reports_committed_by_default: false,
  },
  scores: {
    readiness: 1,
  },
  score_interpretation: {
    denominator: "self-test gate",
    behavioral_quality_score: false,
    non_behavioral_metric_share: 1,
    excluded_claims_field: "does_not_prove",
  },
  metrics: {},
  failures: [],
  does_not_prove: ["live agent task success"],
  final_status: "pass",
};

check("summary schema accepts deterministic readiness summary", () => {
  expectNoSchemaFailure(validateJsonSchemaLite(validSummary, summarySchema, "validSummary"));
});

check("summary schema rejects live model success claim surface", () => {
  const badSummary = { ...validSummary, live_model_used: true };
  expectSchemaFailure(validateJsonSchemaLite(badSummary, summarySchema, "badLiveSummary"), "expected const false");
});

check("summary schema rejects behavioral quality score flag", () => {
  const badSummary = {
    ...validSummary,
    score_interpretation: {
      ...validSummary.score_interpretation,
      behavioral_quality_score: true,
    },
  };
  expectSchemaFailure(validateJsonSchemaLite(badSummary, summarySchema, "badQualitySummary"), "expected const false");
});

const result = { valid: failures.length === 0, checks, failures };
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exit(1);

function check(name, fn) {
  try {
    fn();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false });
    failures.push(`${name}: ${error.message}`);
  }
}

function expectThrow(fn) {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error("expected function to throw");
}

function expectNoSchemaFailure(schemaFailures) {
  if (schemaFailures.length > 0) {
    throw new Error(`expected no schema failures, got ${schemaFailures.join("; ")}`);
  }
}

function expectSchemaFailure(schemaFailures, expectedText) {
  if (!schemaFailures.some((failure) => failure.includes(expectedText))) {
    throw new Error(`expected schema failure containing ${JSON.stringify(expectedText)}, got ${schemaFailures.join("; ")}`);
  }
}
