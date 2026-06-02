#!/usr/bin/env node
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { assertSafeOutputTarget, ensureDir, escapeHtml, getPaths, parseArgs, readJson, resolveRepoPath, writeText } from "./lib.mjs";

function renderDashboard(summary) {
  const scores = Object.entries(summary.scores ?? {});
  const failures = summary.failures ?? [];
  const metrics = summary.metrics ?? {};
  const scoreRows = scores.map(([name, value]) => {
    const pct = Math.round(Number(value) * 100);
    return `<tr><td>${escapeHtml(name)}</td><td><div class="bar"><span style="width:${pct}%"></span></div></td><td>${pct}%</td></tr>`;
  }).join("\n");
  const failureItems = failures.length === 0
    ? "<li>No failures.</li>"
    : failures.map((failure) => `<li>${escapeHtml(failure)}</li>`).join("\n");
  const limits = (summary.does_not_prove ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  const next = (summary.next_live_eval_requirements ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Codex-only eval dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #202124; background: #f7f8fa; }
    main { max-width: 1080px; margin: 0 auto; }
    section { background: #fff; border: 1px solid #d8dee4; border-radius: 8px; padding: 20px; margin: 16px 0; }
    h1, h2 { margin: 0 0 12px; }
    .status { display: inline-block; padding: 4px 10px; border-radius: 999px; font-weight: 700; }
    .pass { background: #dafbe1; color: #116329; }
    .fail { background: #ffebe9; color: #cf222e; }
    .warn { background: #fff8c5; color: #7d4e00; }
    table { width: 100%; border-collapse: collapse; }
    td, th { text-align: left; padding: 10px; border-bottom: 1px solid #d8dee4; }
    .bar { height: 10px; background: #d8dee4; border-radius: 999px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: #0969da; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f6f8fa; padding: 12px; border-radius: 6px; }
  </style>
</head>
<body>
<main>
  <h1>Codex-only Eval Dashboard</h1>
  <p>
    <span class="status ${summary.final_status === "pass" ? "pass" : "fail"}">${escapeHtml(summary.final_status)}</span>
    ${escapeHtml(summary.run_type)} at ${escapeHtml(summary.timestamp)}
  </p>
  <section>
    <h2>Readiness Gates</h2>
    <table><tbody>${scoreRows}</tbody></table>
    <p>${escapeHtml(JSON.stringify(summary.score_interpretation ?? {}, null, 2))}</p>
  </section>
  <section>
    <h2>Scope Warning</h2>
    <p><span class="status warn">Readiness only</span></p>
    <ul>${limits}</ul>
  </section>
  <section>
    <h2>Failures</h2>
    <ul>${failureItems}</ul>
  </section>
  <section>
    <h2>Next Live Eval Requirements</h2>
    <ul>${next}</ul>
  </section>
  <section>
    <h2>Metrics</h2>
    <pre>${escapeHtml(JSON.stringify(metrics, null, 2))}</pre>
  </section>
</main>
</body>
</html>
`;
}

function main() {
  const paths = getPaths(import.meta.url);
  const args = parseArgs();
  const summaryPath = resolveRepoPath(paths.repoRoot, args.summary);
  if (!summaryPath || !existsSync(summaryPath)) {
    console.error("Missing --summary path. Run npm run eval:codex:smoke first.");
    process.exit(1);
  }
  const outPath = resolveRepoPath(paths.repoRoot, args.out ?? ".codex-eval-runs/latest-smoke/dashboard.html");
  assertSafeOutputTarget(paths, outPath);
  ensureDir(dirname(outPath));
  writeText(outPath, renderDashboard(readJson(summaryPath)));
  console.log(JSON.stringify({ valid: true, dashboard: outPath }, null, 2));
}

if (process.argv[1]?.endsWith("render-dashboard.mjs")) main();
