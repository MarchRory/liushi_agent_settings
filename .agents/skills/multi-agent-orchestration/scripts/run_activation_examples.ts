#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { buildPacket, selectStrategy, skillDir } from "./lib/strategy_common.js";

type Example = {
  strategy_id: string;
  strategy_under_test?: string;
  context: Record<string, unknown>;
  expected_activation?: Record<string, unknown>;
};

const assertMode = process.argv.includes("--assert");
const examplesPath = resolve(skillDir(), "examples", "strategy-activation-examples.yaml");
const parsed = parseYaml(readFileSync(examplesPath, "utf8")) as { examples: Example[] };
const failures: string[] = [];
const results = parsed.examples.map((example) => {
  const packet = example.strategy_under_test ? buildPacket(example.strategy_under_test, example.context) : selectStrategy(example.context);
  if (packet.strategy_id !== example.strategy_id) {
    failures.push(`${example.strategy_id}: expected strategy_id ${example.strategy_id}, got ${packet.strategy_id}`);
  }
  for (const [key, expected] of Object.entries(example.expected_activation ?? {})) {
    const actual = (packet as unknown as Record<string, unknown>)[key];
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      failures.push(`${example.strategy_id}: expected ${key} ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  return { example: example.strategy_id, actual: packet.strategy_id, eligible: packet.eligible, score: packet.score };
});

console.log(JSON.stringify({ valid: failures.length === 0, failures, results }, null, 2));
if (assertMode && failures.length > 0) process.exit(1);
