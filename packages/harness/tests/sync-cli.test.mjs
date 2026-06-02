#!/usr/bin/env node
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const cliPath = join(repoRoot, "packages", "harness", "bin", "agent-harness.mjs");
const adapterPath = join(repoRoot, "packages", "codex-config");
const failures = [];
const tempRoots = [];

process.on("exit", () => {
  for (const path of tempRoots) rmSync(path, { recursive: true, force: true });
});

test("sync defaults to dry-run and does not write target files", () => {
  const target = tempDir();
  const result = runCli(["sync", "--target", target, "--adapter", adapterPath]);
  assert(result.status === 1, "dry-run sync should exit non-zero when changes are pending");
  assert(!existsSync(join(target, "AGENTS.md")), "dry-run sync should not create AGENTS.md");
  assertJson(result.stderr, (json) => {
    assert(json.dryRun === true, "dry-run sync should report dryRun=true");
    assert(json.diffs?.some((diff) => diff.type === "missing_target"), "dry-run sync should report missing targets");
  });
});

test("sync --write preserves extra target files by default", () => {
  const target = tempDir();
  const localSkill = join(target, ".agents", "skills", "local-only", "SKILL.md");
  writeFile(localSkill, "# Local Only\n");
  const result = runCli(["sync", "--write", "--target", target, "--adapter", adapterPath]);
  assert(result.status === 0, `sync --write should pass: ${result.stderr}`);
  assert(existsSync(localSkill), "default sync --write should preserve local extra files");
});

test("sync --write --delete-extra=false preserves extra target files explicitly", () => {
  const target = tempDir();
  const localSkill = join(target, ".agents", "skills", "local-only", "SKILL.md");
  writeFile(localSkill, "# Local Only\n");
  const result = runCli(["sync", "--write", "--delete-extra=false", "--target", target, "--adapter", adapterPath]);
  assert(result.status === 0, `explicit non-deleting sync should pass: ${result.stderr}`);
  assert(existsSync(localSkill), "sync --write --delete-extra=false should preserve local extra files");
});

test(".agent-harnessignore protects local files during strict deletion", () => {
  const target = tempDir();
  const protectedFile = join(target, ".agents", "skills", "local-only", "SKILL.md");
  const deletedFile = join(target, ".agents", "skills", "delete-me", "SKILL.md");
  writeFile(join(target, ".agent-harnessignore"), ".agents/skills/local-only/\n");
  writeFile(protectedFile, "# Local Only\n");
  writeFile(deletedFile, "# Delete Me\n");

  const result = runCli(["sync", "--write", "--delete-extra=true", "--target", target, "--adapter", adapterPath]);
  assert(result.status === 0, `strict sync should pass: ${result.stderr}`);
  assert(existsSync(protectedFile), "strict sync should preserve ignored local files");
  assert(!existsSync(deletedFile), "strict sync should remove unignored extra files");
});

test("local overlay participates in sync and check", () => {
  const target = tempDir();
  const overlay = tempDir();
  const overlayAgents = "# Overlay Agents\n";
  writeFile(join(overlay, "AGENTS.md"), overlayAgents);

  const syncResult = runCli(["sync", "--write", "--overlay", overlay, "--target", target, "--adapter", adapterPath]);
  assert(syncResult.status === 0, `overlay sync should pass: ${syncResult.stderr}`);
  assert(readFileSync(join(target, "AGENTS.md"), "utf8") === overlayAgents, "overlay should override AGENTS.md");

  const checkResult = runCli(["check", "--overlay", overlay, "--target", target, "--adapter", adapterPath]);
  assert(checkResult.status === 0, `overlay check should pass: ${checkResult.stderr}`);
});

if (failures.length > 0) {
  console.error(JSON.stringify({ valid: false, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, tests: 5 }, null, 2));

function test(name, fn) {
  try {
    fn();
  } catch (error) {
    failures.push({ name, message: error.message });
  }
}

function runCli(args) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function tempDir() {
  const path = mkdtempSync(join(tmpdir(), "agent-harness-sync-"));
  tempRoots.push(path);
  return path;
}

function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertJson(value, fn) {
  try {
    fn(JSON.parse(value));
  } catch (error) {
    throw new Error(`expected JSON output: ${error.message}; output=${value}`);
  }
}
