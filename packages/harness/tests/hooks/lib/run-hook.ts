import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(testRoot, "..", "..", "..", "..", "..");

export function runHook(scriptName, input) {
  const scriptPath = join(repoRoot, "packages", "codex-config", "src", ".codex", "hooks", scriptName);
  const result = spawnHookScript(repoRoot, scriptPath, input);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

export function assertBlock(payload, reasonIncludes) {
  assert.equal(payload.decision, "block");
  assert.match(payload.reason, reasonIncludes);
}

export function assertPass(payload) {
  assert.deepEqual(payload, {});
}

export function spawnHookScript(cwd, scriptPath, input) {
  const executable = process.platform === "win32" ? "tsx.cmd" : "tsx";
  const localTsx = join(cwd, "node_modules", ".bin", executable);
  const tsxPath = existsSync(localTsx) ? localTsx : join(repoRoot, "node_modules", ".bin", executable);
  return spawnSync(tsxPath, [scriptPath], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
}
