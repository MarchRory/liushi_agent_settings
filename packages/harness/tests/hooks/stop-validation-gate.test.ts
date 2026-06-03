#!/usr/bin/env node
import { assertBlock, assertPass, runHook } from "./lib/run-hook.ts";

assertBlock(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response: "All tests passed.",
  }),
  /without command.*exit code evidence/iu,
);

assertBlock(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response: "Validation passed. result: passed.",
  }),
  /without command.*exit code evidence/iu,
);

assertBlock(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response: "Implemented hook files and updated package scripts.",
  }),
  /does not list changed files|lacks a structured validation record/iu,
);

assertBlock(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response: 'validation.status = not_run\nreason: missing npm\nrecommended_command: npm run validate',
  }),
  /not_run lacks/iu,
);

assertPass(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response: "Reviewed the updated plan. No files changed.",
  }),
);

assertPass(
  runHook("stop_validation_gate.ts", {
    hookEventName: "Stop",
    final_response:
      "Changed files: .codex/hooks/stop_validation_gate.ts\nValidation: status passed; commands_run npm run test:hooks; exit_code 0; result passed; failures none; unverified_risks none.",
  }),
);

console.log(JSON.stringify({ valid: true, tests: 6 }, null, 2));
