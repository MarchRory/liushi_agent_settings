#!/usr/bin/env node
import assert from "node:assert/strict";
import { runHook } from "./lib/run-hook.ts";

const deniedCommand = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: "git reset --hard HEAD~1" },
});
assert.equal(deniedCommand.hookSpecificOutput.permissionDecision, "deny");
assert.match(deniedCommand.hookSpecificOutput.permissionDecisionReason, /destructive command/iu);

const deniedSensitiveWrite = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Write",
  tool_input: { path: ".env" },
});
assert.equal(deniedSensitiveWrite.hookSpecificOutput.permissionDecision, "deny");
assert.match(deniedSensitiveWrite.hookSpecificOutput.permissionDecisionReason, /sensitive path/iu);

const deniedRootSecretWrite = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Write",
  tool_input: { path: "secret.txt" },
});
assert.equal(deniedRootSecretWrite.hookSpecificOutput.permissionDecision, "deny");
assert.match(deniedRootSecretWrite.hookSpecificOutput.permissionDecisionReason, /sensitive path/iu);

const deniedRootCredentialWrite = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Write",
  tool_input: { path: "credential.json" },
});
assert.equal(deniedRootCredentialWrite.hookSpecificOutput.permissionDecision, "deny");
assert.match(deniedRootCredentialWrite.hookSpecificOutput.permissionDecisionReason, /sensitive path/iu);

const deniedPolicyWrite = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Write",
  tool_input: { path: ".harness/policies/safety.yaml" },
});
assert.equal(deniedPolicyWrite.hookSpecificOutput.permissionDecision, "deny");
assert.match(deniedPolicyWrite.hookSpecificOutput.permissionDecisionReason, /policy or hook modification/iu);

const allowedPolicyWriteWithContext = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  prompt: "Implement Sprint 1 Codex Hook Foundation and modify policy task wiring.",
  tool_name: "Write",
  tool_input: { path: ".codex/hooks/pre_tool_use_policy.ts" },
});
assert.match(allowedPolicyWriteWithContext.hookSpecificOutput.additionalContext, /policy or hook surface/iu);

const allowedValidation = runHook("pre_tool_use_policy.ts", {
  hookEventName: "PreToolUse",
  tool_name: "Bash",
  tool_input: { command: "npm run validate" },
});
assert.deepEqual(allowedValidation, {});

console.log(JSON.stringify({ valid: true, tests: 7 }, null, 2));
