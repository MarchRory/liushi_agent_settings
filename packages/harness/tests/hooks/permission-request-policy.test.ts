#!/usr/bin/env node
import assert from "node:assert/strict";
import { runHook } from "./lib/run-hook.ts";

const allowedValidation = runHook("permission_request_policy.ts", {
  hookEventName: "PermissionRequest",
  command: "npm run validate",
});
assert.equal(allowedValidation.hookSpecificOutput.decision.behavior, "allow");

const deniedDestroy = runHook("permission_request_policy.ts", {
  hookEventName: "PermissionRequest",
  command: "terraform destroy",
  description: "Please allow this deployment cleanup.",
});
assert.equal(deniedDestroy.hookSpecificOutput.decision.behavior, "deny");
assert.match(deniedDestroy.hookSpecificOutput.decision.message, /approval record/iu);

const deniedDockerPrune = runHook("permission_request_policy.ts", {
  hookEventName: "PermissionRequest",
  command: "docker volume prune",
  description: "Please approve this cleanup.",
});
assert.equal(deniedDockerPrune.hookSpecificOutput.decision.behavior, "deny");
assert.match(deniedDockerPrune.hookSpecificOutput.decision.message, /approval record/iu);

const allowedWithRecord = runHook("permission_request_policy.ts", {
  hookEventName: "PermissionRequest",
  command: "terraform destroy",
  description:
    "Approval record: operation terraform destroy; exact target resource staging workspace; reason cleanup; risk cloud deletion; safer alternative considered dry run.",
});
assert.equal(allowedWithRecord.hookSpecificOutput.decision.behavior, "allow");

console.log(JSON.stringify({ valid: true, tests: 4 }, null, 2));
