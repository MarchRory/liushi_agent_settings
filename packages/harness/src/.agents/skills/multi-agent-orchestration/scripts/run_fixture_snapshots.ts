#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { selectStrategy, skillDir, type TaskContext } from "./lib/strategy_common.js";

type Fixture = {
  id: string;
  description: string;
  input: TaskContext;
  expected: Record<string, unknown>;
};

const updateMode = process.argv.includes("--update");
const assertMode = process.argv.includes("--assert") || !updateMode;
const fixturesDir = resolve(skillDir(), "fixtures");
const snapshotsDir = resolve(skillDir(), "snapshots");
const requiredPacketFields = [
  "selected_strategy",
  "reason",
  "confidence",
  "agents",
  "missing_evidence",
  "safety_gate",
  "expected_outputs",
];

const failures: string[] = [];
const results: Array<{ id: string; expected: string; actual: string; passed: boolean }> = [];

if (!existsSync(fixturesDir)) {
  failures.push(`fixtures directory does not exist: ${fixturesDir}`);
} else {
  if (updateMode) mkdirSync(snapshotsDir, { recursive: true });

  for (const file of readdirSync(fixturesDir).filter((name) => name.endsWith(".json")).sort()) {
    const fixture = readJson<Fixture>(resolve(fixturesDir, file));
    const actual = selectStrategy(fixture.input);
    const snapshotPath = resolve(snapshotsDir, `${fixture.id}.expected.json`);
    let passed = true;

    for (const field of requiredPacketFields) {
      if (!(field in actual)) {
        failures.push(`${fixture.id}: activation packet missing required field ${field}`);
        passed = false;
      }
    }

    const subsetFailures = compareSubset(fixture.expected, actual, fixture.id);
    if (subsetFailures.length > 0) {
      failures.push(...subsetFailures);
      passed = false;
    }

    if (updateMode) {
      writeFileSync(snapshotPath, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
    } else if (!existsSync(snapshotPath)) {
      failures.push(`${fixture.id}: missing snapshot ${snapshotPath}`);
      passed = false;
    } else {
      const expectedSnapshot = readJson<Record<string, unknown>>(snapshotPath);
      if (JSON.stringify(expectedSnapshot) !== JSON.stringify(actual)) {
        failures.push(`${fixture.id}: snapshot mismatch; run npm run fixtures:update if the changed packet is intentional`);
        passed = false;
      }
    }

    results.push({
      id: fixture.id,
      expected: String(fixture.expected.selected_strategy ?? fixture.expected.strategy_id ?? "unknown"),
      actual: actual.strategy_id,
      passed,
    });
  }
}

const passedCount = results.filter((result) => result.passed).length;
const strategyMatches = results.filter((result) => result.expected === result.actual).length;
const metrics = {
  fixture_count: results.length,
  fixture_pass_rate: ratio(passedCount, results.length),
  strategy_selection_accuracy: ratio(strategyMatches, results.length),
  required_field_pass_rate: failures.some((failure) => failure.includes("missing required field")) ? 0 : 1,
  snapshot_stability: failures.some((failure) => failure.includes("snapshot")) ? 0 : 1,
};

console.log(JSON.stringify({ valid: failures.length === 0, metrics, failures, results }, null, 2));
if (assertMode && failures.length > 0) process.exit(1);

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    failures.push(`${basename(path)}: invalid JSON: ${(error as Error).message}`);
    return {} as T;
  }
}

function compareSubset(expected: unknown, actual: unknown, path: string): string[] {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return [`${path}: expected array, got ${typeof actual}`];
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      return [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
    }
    return [];
  }

  if (expected !== null && typeof expected === "object") {
    if (actual === null || typeof actual !== "object") return [`${path}: expected object, got ${typeof actual}`];
    const failuresForObject: string[] = [];
    const actualRecord = actual as Record<string, unknown>;
    for (const [key, expectedValue] of Object.entries(expected as Record<string, unknown>)) {
      if (!(key in actualRecord)) {
        failuresForObject.push(`${path}.${key}: missing`);
        continue;
      }
      failuresForObject.push(...compareSubset(expectedValue, actualRecord[key], `${path}.${key}`));
    }
    return failuresForObject;
  }

  return expected === actual ? [] : [`${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`];
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Number((numerator / denominator).toFixed(4));
}
