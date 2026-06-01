#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { loadRegistry, skillDir } from "./lib/strategy_common.js";

type Example = {
  strategy_id: string;
  context: Record<string, unknown>;
};

const requireFromSkill = createRequire(resolve(skillDir(), "package.json"));
const tsxCli = requireFromSkill.resolve("tsx/cli");
const examplesPath = resolve(skillDir(), "examples", "strategy-activation-examples.yaml");
const examples = (parseYaml(readFileSync(examplesPath, "utf8")) as { examples: Example[] }).examples;
const contextByStrategy = new Map(examples.map((example) => [example.strategy_id, example.context]));
const failures: string[] = [];

for (const strategy of loadRegistry().strategies ?? []) {
  const script = resolve(skillDir(), strategy.script);
  const context = contextByStrategy.get(strategy.id);
  if (!context) {
    failures.push(`${strategy.id}: missing activation example context`);
    continue;
  }

  runJson(`${strategy.id} --validate`, [script, "--validate"], (json) => {
    if (json.valid !== true) failures.push(`${strategy.id}: --validate returned ${JSON.stringify(json)}`);
  });

  runText(`${strategy.id} --help`, [script, "--help"], (stdout) => {
    if (!stdout.toLowerCase().includes("usage:")) failures.push(`${strategy.id}: --help did not print usage`);
  });

  runJson(`${strategy.id} packet`, [script, "--context", JSON.stringify(context)], (json) => {
    if (json.strategy_id !== strategy.id) {
      failures.push(`${strategy.id}: wrapper returned strategy_id ${json.strategy_id}`);
    }
    if (json.script_contract?.read_only !== true || json.script_contract?.repo_mutation !== false) {
      failures.push(`${strategy.id}: wrapper returned unsafe script_contract ${JSON.stringify(json.script_contract)}`);
    }
  });
}

console.log(JSON.stringify({ valid: failures.length === 0, failures }, null, 2));
if (failures.length > 0) process.exit(1);

function runJson(label: string, args: string[], assertJson: (json: Record<string, any>) => void): void {
  runText(label, args, (stdout) => {
    try {
      assertJson(JSON.parse(stdout) as Record<string, any>);
    } catch (error) {
      failures.push(`${label}: invalid JSON output: ${(error as Error).message}`);
    }
  });
}

function runText(label: string, args: string[], assertText: (stdout: string) => void): void {
  const result = spawnSync(process.execPath, [tsxCli, ...args], {
    cwd: skillDir(),
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    failures.push(`${label}: exited ${result.status}; error=${result.error?.message ?? ""}; stderr=${(result.stderr ?? "").trim()}`);
    return;
  }
  assertText(result.stdout.trim());
}
