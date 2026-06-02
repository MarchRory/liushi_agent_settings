#!/usr/bin/env node
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getPaths,
  assertSafeOutputTarget,
  loadEvalTasks,
  loadKnownAgents,
  nowIso,
  parseArgs,
  readJson,
  readText,
  rel,
  resolveRepoPath,
  scoreRate,
  writeJson,
} from "./lib.mjs";
import { validateDatasets } from "./validate-datasets.mjs";

const RUNTIME_MARKERS = [
  "Specialized lane:",
  "Trigger when:",
  "Do not use when:",
  "Reject / redirect:",
  "Sharp deliverables:",
  "Evidence requirements:",
  "Completion gate:",
];

const SIDECAR_MARKERS = [
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

const WORKFLOW_MARKERS = [
  "## Intake",
  "## Role Procedure",
  "## Evidence Rules",
  "## Handoff and Escalation",
  "## Refusal Conditions",
  "## Completion Checklist",
];

export function runStaticEval(options = {}) {
  const paths = options.paths ?? getPaths(import.meta.url);
  const failures = [];
  const datasetValidation = validateDatasets({ paths });
  failures.push(...datasetValidation.failures);
  const rubric = readJson(join(paths.rubricsRoot, "roles.json"));
  const minCoverage = rubric.acceptance?.agent_fixture_coverage_min_per_agent ?? 3;
  const agents = loadKnownAgents(paths);
  const loaded = loadEvalTasks(paths);
  const tasks = loaded.tasks.map((item) => item.record);
  const coverage = Object.fromEntries(agents.map((agent) => [agent.name, 0]));
  for (const task of tasks) {
    for (const agent of task.expected_agents ?? []) {
      if (agent in coverage) coverage[agent] += 1;
    }
  }

  const checks = {
    agents: agents.length,
    runtime_marker_checks: 0,
    runtime_marker_passes: 0,
    sidecar_contract_checks: 0,
    sidecar_contract_passes: 0,
    workflow_contract_checks: 0,
    workflow_contract_passes: 0,
    materialized_sync_checks: 0,
    materialized_sync_passes: 0,
    coverage_checks: 0,
    coverage_passes: 0,
    anti_hype_guardrail_checks: 0,
    anti_hype_guardrail_passes: 0,
  };

  for (const agent of agents) {
    const sourceText = existsSync(agent.sourceFile) ? readText(agent.sourceFile) : "";
    const rootText = existsSync(agent.rootFile) ? readText(agent.rootFile) : "";
    checks.materialized_sync_checks += 1;
    if (sourceText && rootText && sourceText === rootText) {
      checks.materialized_sync_passes += 1;
    } else {
      failures.push(`${rel(paths.repoRoot, agent.rootFile)}: materialized TOML differs from package source`);
    }

    for (const marker of RUNTIME_MARKERS) {
      checks.runtime_marker_checks += 1;
      if (sourceText.includes(marker)) {
        checks.runtime_marker_passes += 1;
      } else {
        failures.push(`${rel(paths.repoRoot, agent.sourceFile)}: missing runtime marker ${marker}`);
      }
    }

    const sidecarSource = join(paths.codexSource, "agents", agent.name);
    const requiredSidecarFiles = [
      "AGENT.md",
      "references/workflow.md",
      "references/output-schema.md",
      "examples/handoff.yaml",
      "examples/standard-output.yaml",
    ];
    for (const required of requiredSidecarFiles) {
      checks.sidecar_contract_checks += 1;
      if (existsSync(join(sidecarSource, required))) {
        checks.sidecar_contract_passes += 1;
      } else {
        failures.push(`${rel(paths.repoRoot, sidecarSource)}: missing ${required}`);
      }
    }
    const agentDoc = join(sidecarSource, "AGENT.md");
    const agentDocText = existsSync(agentDoc) ? readText(agentDoc) : "";
    for (const marker of SIDECAR_MARKERS) {
      checks.sidecar_contract_checks += 1;
      if (agentDocText.includes(marker)) {
        checks.sidecar_contract_passes += 1;
      } else {
        failures.push(`${rel(paths.repoRoot, agentDoc)}: missing sidecar marker ${marker}`);
      }
    }

    const workflow = join(sidecarSource, "references", "workflow.md");
    const workflowText = existsSync(workflow) ? readText(workflow) : "";
    for (const marker of WORKFLOW_MARKERS) {
      checks.workflow_contract_checks += 1;
      if (workflowText.includes(marker)) {
        checks.workflow_contract_passes += 1;
      } else {
        failures.push(`${rel(paths.repoRoot, workflow)}: missing workflow marker ${marker}`);
      }
    }

    checks.coverage_checks += 1;
    if ((coverage[agent.name] ?? 0) >= minCoverage) {
      checks.coverage_passes += 1;
    } else {
      failures.push(`datasets: agent ${agent.name} has ${coverage[agent.name] ?? 0} fixtures; required ${minCoverage}`);
    }
  }

  const packageReadme = join(paths.packageRoot, "README.md");
  const readmeText = existsSync(packageReadme) ? readText(packageReadme) : "";
  for (const phrase of ["readiness, not live agent effectiveness", "What This Does Not Prove", "same tasks, same budget"]) {
    checks.anti_hype_guardrail_checks += 1;
    if (readmeText.includes(phrase)) {
      checks.anti_hype_guardrail_passes += 1;
    } else {
      failures.push(`${rel(paths.repoRoot, packageReadme)}: missing anti-hype guardrail phrase ${phrase}`);
    }
  }

  const scores = {
    dataset_reference_pass_rate: datasetValidation.valid ? 1 : 0,
    runtime_marker_pass_rate: scoreRate(checks.runtime_marker_passes, checks.runtime_marker_checks),
    sidecar_contract_pass_rate: scoreRate(checks.sidecar_contract_passes, checks.sidecar_contract_checks),
    workflow_contract_pass_rate: scoreRate(checks.workflow_contract_passes, checks.workflow_contract_checks),
    materialized_sync_pass_rate: scoreRate(checks.materialized_sync_passes, checks.materialized_sync_checks),
    agent_fixture_coverage_pass_rate: scoreRate(checks.coverage_passes, checks.coverage_checks),
    anti_hype_guardrail_pass_rate: scoreRate(checks.anti_hype_guardrail_passes, checks.anti_hype_guardrail_checks),
  };
  const readinessScore = Math.min(...Object.values(scores));
  scores.codex_only_static_readiness = readinessScore;

  return {
    run_type: "codex-only-static-readiness-v0.1",
    timestamp: nowIso(),
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
    scores,
    score_interpretation: {
      denominator: "deterministic configuration, dataset, and output-policy gates",
      behavioral_quality_score: false,
      non_behavioral_metric_share: 1,
      excluded_claims_field: "does_not_prove",
    },
    metrics: {
      checks,
      agent_coverage: coverage,
      dataset_validation: datasetValidation.checks,
      acceptance: {
        min_coverage_per_agent: minCoverage,
        readiness_threshold: rubric.acceptance?.static_readiness_min ?? 1.0,
      },
    },
    failures,
    does_not_prove: [
      "live agent task success",
      "cost or latency improvement",
      "superiority over baseline or generic agents",
      "generalization to unseen tasks"
    ],
    final_status: failures.length === 0 && readinessScore === 1 ? "pass" : "fail",
  };
}

function main() {
  const paths = getPaths(import.meta.url);
  const args = parseArgs();
  const summary = runStaticEval({ paths });
  const outDir = resolveRepoPath(paths.repoRoot, args.out);
  if (outDir) {
    assertSafeOutputTarget(paths, outDir);
    writeJson(join(outDir, "summary.json"), summary);
  }
  console.log(JSON.stringify(summary, null, 2));
  if (summary.final_status !== "pass") process.exit(1);
}

if (process.argv[1]?.endsWith("run-static-eval.mjs")) main();
