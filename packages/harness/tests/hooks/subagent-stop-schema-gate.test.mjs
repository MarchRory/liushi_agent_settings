#!/usr/bin/env node
import { assertBlock, assertPass, runHook } from "./lib/run-hook.mjs";

assertBlock(
  runHook("subagent_stop_schema_gate.mjs", {
    hookEventName: "SubagentStop",
    agent_type: "tester",
    last_assistant_message: "All tests passed.",
  }),
  /without command evidence/iu,
);

assertBlock(
  runHook("subagent_stop_schema_gate.mjs", {
    hookEventName: "SubagentStop",
    agent_type: "reviewer",
    last_assistant_message: "finding: this may break sync. severity: major. impact: root drift.",
  }),
  /lacks evidence/iu,
);

assertBlock(
  runHook("subagent_stop_schema_gate.mjs", {
    hookEventName: "SubagentStop",
    agent_type: "critic",
    last_assistant_message: "Concern",
  }),
  /generic skepticism/iu,
);

assertBlock(
  runHook("subagent_stop_schema_gate.mjs", {
    hookEventName: "SubagentStop",
    agent_type: "architect",
    last_assistant_message: "decision: recommend hook foundation. selected option: repo-local hooks.",
  }),
  /rejected options/iu,
);

assertPass(
  runHook("subagent_stop_schema_gate.mjs", {
    hookEventName: "SubagentStop",
    agent_type: "tester",
    last_assistant_message:
      "claims_under_test: npm run validate. command: npm run validate. cwd: repo. exit_code: 0. decisive_output: valid true.",
  }),
);

console.log(JSON.stringify({ valid: true, tests: 5 }, null, 2));
