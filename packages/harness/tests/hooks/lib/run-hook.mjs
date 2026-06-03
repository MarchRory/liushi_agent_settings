import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testRoot = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(testRoot, "..", "..", "..", "..", "..");

export function runHook(scriptName, input) {
  const scriptPath = join(repoRoot, "packages", "codex-config", "src", ".codex", "hooks", scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
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
