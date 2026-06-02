#!/usr/bin/env node
import { join } from "node:path";
import {
  getPaths,
  assertSafeOutputTarget,
  loadEvalTasks,
  loadKnownAgents,
  nowIso,
  parseArgs,
  readJson,
  resolveRepoPath,
  scoreRate,
  writeJson,
} from "./lib.mjs";
import { validateDatasets } from "./validate-datasets.mjs";
import { runStaticEval } from "./run-static-eval.mjs";

function runSmoke(options = {}) {
  const paths = options.paths ?? getPaths(import.meta.url);
  const rubric = readJson(join(paths.rubricsRoot, "roles.json"));
  const minCoverage = rubric.acceptance?.agent_fixture_coverage_min_per_agent ?? 3;
  const dataset = validateDatasets({ paths });
  const staticSummary = runStaticEval({ paths });
  const loaded = loadEvalTasks(paths);
  const agents = loadKnownAgents(paths).map((agent) => agent.name);
  const tasks = loaded.tasks.map((item) => item.record);
  const tasksBySuite = {};
  const tasksByClaimScope = {};
  const expectedCoverage = Object.fromEntries(agents.map((agent) => [agent, 0]));
  let leadOnlyCases = 0;
  let liveAbRequiredCases = 0;

  for (const task of tasks) {
    tasksBySuite[task.suite] = (tasksBySuite[task.suite] ?? 0) + 1;
    tasksByClaimScope[task.claim_scope] = (tasksByClaimScope[task.claim_scope] ?? 0) + 1;
    if ((task.expected_agents ?? []).length === 0) leadOnlyCases += 1;
    if (task.claim_scope === "live_ab_required") liveAbRequiredCases += 1;
    for (const agent of task.expected_agents ?? []) {
      if (agent in expectedCoverage) expectedCoverage[agent] += 1;
    }
  }

  const failures = [...dataset.failures, ...staticSummary.failures];
  const scores = {
    dataset_readiness: dataset.valid ? 1 : 0,
    static_readiness: staticSummary.scores.codex_only_static_readiness,
    fixture_coverage_readiness: scoreRate(Object.values(expectedCoverage).filter((count) => count >= minCoverage).length, agents.length),
    anti_hype_design_gate: liveAbRequiredCases >= 1 && staticSummary.does_not_prove.length >= 4 ? 1 : 0,
    dashboard_input_ready: failures.length === 0 ? 1 : 0,
  };
  scores.codex_only_smoke_readiness = Math.min(...Object.values(scores));

  return {
    run_type: "codex-only-deterministic-smoke-v0.1",
    timestamp: nowIso(),
    configuration: "packages/codex-config/src/.codex",
    evaluated_surface: ".codex",
    claim_scope: "deterministic_smoke_only",
    dataset_visibility: "visible_dev_set",
    live_model_used: false,
    llm_judge: "disabled",
    model: null,
    output_policy: {
      generated_outputs_ignored: true,
      default_output_dir: ".codex-eval-runs/",
      reports_committed_by_default: false,
    },
    scores,
    score_interpretation: {
      denominator: "deterministic dataset, static-readiness, fixture-coverage, anti-hype, and dashboard-input gates",
      behavioral_quality_score: false,
      non_behavioral_metric_share: 1,
      excluded_claims_field: "does_not_prove",
    },
    metrics: {
      task_count: tasks.length,
      dataset_files: loaded.files.length,
      tasks_by_suite: tasksBySuite,
      tasks_by_claim_scope: tasksByClaimScope,
      expected_agent_coverage: expectedCoverage,
      lead_only_cases: leadOnlyCases,
      live_ab_required_cases: liveAbRequiredCases,
      min_coverage_per_agent: minCoverage,
      static_scores: staticSummary.scores,
    },
    failures,
    does_not_prove: [
      "live agent task success",
      "agent routing accuracy under an actual Codex runtime",
      "quality delta against baseline/root-only/generic-agent settings",
      "statistical significance"
    ],
    next_live_eval_requirements: [
      "same tasks and prompts across configurations",
      "same model, sandbox, tool, token, and wall-clock budget",
      "baseline/root-only/full-harness or generic-agent comparison",
      "multiple repeats per task with trace capture",
      "human-audited or calibrated judge scoring"
    ],
    final_status: failures.length === 0 && scores.codex_only_smoke_readiness === 1 ? "pass" : "fail",
  };
}

function main() {
  const paths = getPaths(import.meta.url);
  const args = parseArgs();
  const summary = runSmoke({ paths });
  const outDir = resolveRepoPath(paths.repoRoot, args.out);
  if (outDir) {
    assertSafeOutputTarget(paths, outDir);
    writeJson(join(outDir, "summary.json"), summary);
  }
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== "pass") process.exit(1);
}

if (process.argv[1]?.endsWith("run-codex-smoke.mjs")) main();
