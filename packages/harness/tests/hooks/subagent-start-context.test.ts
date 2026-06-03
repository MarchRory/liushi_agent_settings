#!/usr/bin/env node
import assert from "node:assert/strict";
import { runHook } from "./lib/run-hook.ts";

const reviewer = runHook("subagent_start_context.ts", {
  hookEventName: "SubagentStart",
  agent_type: "reviewer",
});
assert.match(reviewer.hookSpecificOutput.additionalContext, /defect triage/iu);
assert.match(reviewer.hookSpecificOutput.additionalContext, /severity/iu);

const tester = runHook("subagent_start_context.ts", {
  hookEventName: "SubagentStart",
  agent_type: "tester",
});
assert.match(tester.hookSpecificOutput.additionalContext, /Never claim pass/iu);

const unknown = runHook("subagent_start_context.ts", {
  hookEventName: "SubagentStart",
  agent_type: "unknown-agent",
});
assert.deepEqual(unknown, {});

console.log(JSON.stringify({ valid: true, tests: 3 }, null, 2));
