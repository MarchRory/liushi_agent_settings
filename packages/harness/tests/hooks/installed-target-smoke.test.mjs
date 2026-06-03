#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { repoRoot } from "./lib/run-hook.mjs";

const target = mkdtempSync(join(tmpdir(), "liushi-hook-install-"));

try {
  cpSync(join(repoRoot, "packages", "codex-config", "src", ".codex"), join(target, ".codex"), { recursive: true });
  mkdirSync(join(target, ".harness"), { recursive: true });
  cpSync(join(repoRoot, "packages", "harness", "src", ".harness", "policies"), join(target, ".harness", "policies"), { recursive: true });
  const gitInit = spawnSync("git", ["init"], { cwd: target, encoding: "utf8" });
  assert.equal(gitInit.status, 0, gitInit.stderr);

  const deniedPreToolUse = runInstalledHook(target, "pre_tool_use_policy.mjs", {
    hookEventName: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command: "rm -rf /tmp/example" },
  });
  assert.equal(deniedPreToolUse.hookSpecificOutput.permissionDecision, "deny");

  const deniedPermission = runInstalledHook(target, "permission_request_policy.mjs", {
    hookEventName: "PermissionRequest",
    command: "docker volume prune",
    description: "Approve cleanup.",
  });
  assert.equal(deniedPermission.hookSpecificOutput.decision.behavior, "deny");

  const hooksConfig = JSON.parse(readInstalledFile(target, ".codex/hooks.json"));
  const windowsCommand = hooksConfig.hooks.PreToolUse[0].hooks[0].commandWindows;
  const deniedViaHooksJson = runInstalledHookCommand(target, windowsCommand, {
    hookEventName: "PreToolUse",
    tool_name: "Bash",
    tool_input: { command: "git reset --hard HEAD~1" },
  });
  assert.equal(deniedViaHooksJson.hookSpecificOutput.permissionDecision, "deny");

  const validStop = runInstalledHook(target, "stop_validation_gate.mjs", {
    hookEventName: "Stop",
    final_response:
      "Changed files: .codex/hooks/stop_validation_gate.mjs\nValidation: status passed; commands_run npm run test:hooks; exit_code 0; result passed; failures none; unverified_risks none.",
  });
  assert.deepEqual(validStop, {});
} finally {
  rmSync(target, { recursive: true, force: true });
}

console.log(JSON.stringify({ valid: true, tests: 4 }, null, 2));

function runInstalledHook(projectRoot, scriptName, input) {
  const result = spawnSync(process.execPath, [join(projectRoot, ".codex", "hooks", scriptName)], {
    cwd: projectRoot,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function runInstalledHookCommand(projectRoot, command, input) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], {
    cwd: projectRoot,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

function readInstalledFile(projectRoot, path) {
  return readFileSync(join(projectRoot, path), "utf8");
}
