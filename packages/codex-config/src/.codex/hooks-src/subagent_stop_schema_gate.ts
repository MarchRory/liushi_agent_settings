#!/usr/bin/env node
import { readStdinJson } from "./lib/read-stdin-json.js";
import { block, pass } from "./lib/hook-response.js";
import { flattenText, includesAny } from "./lib/text-patterns.js";

const input = await readStdinJson();
const agentType = input.agent_type ?? input.agentType ?? input.name ?? input.subagent?.name ?? "";
const message = input.last_assistant_message ?? input.lastAssistantMessage ?? input.message ?? input.output ?? "";
const text = flattenText(message);

const reason = checkAgentOutput(agentType, text);
if (reason) block(reason);
else pass();

function checkAgentOutput(agent: string, output: string): string | null {
  if (!output.trim()) return null;
  if (agent === "reviewer") return checkReviewer(output);
  if (agent === "tester") return checkTester(output);
  if (agent === "critic") return checkCritic(output);
  if (agent === "architect") return checkArchitect(output);
  return null;
}

function checkReviewer(output: string): string | null {
  if (/^\s*(lgtm|looks good|seems fine)\s*\.?\s*$/iu.test(output)) return "Reviewer output is too generic; provide findings or a bounded no-findings review with evidence.";
  if (mentionsFinding(output) && !includesAny(output, ["severity"])) return "Reviewer finding lacks severity.";
  if (mentionsFinding(output) && !includesAny(output, ["evidence"])) return "Reviewer finding lacks evidence.";
  if (mentionsFinding(output) && !includesAny(output, ["impact"])) return "Reviewer finding lacks impact.";
  if (mentionsFinding(output) && !includesAny(output, ["fix_hint", "fix hint", "recommended_fix", "recommended correction"])) return "Reviewer finding lacks fix hint.";
  return null;
}

function checkTester(output: string): string | null {
  if (claimsPassed(output) && !hasCommandEvidence(output)) return "Tester claims validation passed without command evidence.";
  if (includesAny(output, ["not_run", "not run"]) && !includesAny(output, ["reason"])) return "Tester not_run output lacks reason.";
  if (includesAny(output, ["not_run", "not run"]) && !includesAny(output, ["recommended_command", "recommended command"])) {
    return "Tester not_run output lacks recommended_command.";
  }
  if (includesAny(output, ["not_run", "not run"]) && !includesAny(output, ["risk"])) return "Tester not_run output lacks risk.";
  return null;
}

function checkCritic(output: string): string | null {
  if (/^\s*(concern|risk|be careful|looks risky)[\s\S]{0,80}$/iu.test(output)) return "Critic output is generic skepticism without a concrete failure mode.";
  if (includesAny(output, ["critique", "risk", "concern"]) && !includesAny(output, ["target_assumption", "target assumption"])) {
    return "Critic critique lacks target_assumption.";
  }
  if (includesAny(output, ["critique", "risk", "concern"]) && !includesAny(output, ["counterexample", "failure mode", "failure story"])) {
    return "Critic critique lacks concrete counterexample or failure mode.";
  }
  if (includesAny(output, ["critique", "risk", "concern"]) && !includesAny(output, ["mitigation"])) return "Critic critique lacks mitigation.";
  return null;
}

function checkArchitect(output: string): string | null {
  if (includesAny(output, ["decision", "recommend"]) && !includesAny(output, ["selected option", "selected_option"])) return "Architect decision lacks selected option.";
  if (includesAny(output, ["decision", "recommend"]) && !includesAny(output, ["rejected option", "rejected_options", "rejected options"])) {
    return "Architect decision lacks rejected options.";
  }
  if (includesAny(output, ["decision", "recommend"]) && !includesAny(output, ["migration plan", "migration_plan"])) return "Architect decision lacks migration plan.";
  if (includesAny(output, ["decision", "recommend"]) && !includesAny(output, ["rollback plan", "rollback", "rollback_point"])) return "Architect decision lacks rollback plan.";
  if (includesAny(output, ["decision", "recommend"]) && !includesAny(output, ["validation gate", "validation_gate"])) return "Architect decision lacks validation gates.";
  return null;
}

function mentionsFinding(output: string): boolean {
  return includesAny(output, ["finding", "findings", "issue", "blocking", "major", "minor"]);
}

function claimsPassed(output: string): boolean {
  return includesAny(output, ["tests passed", "validation passed", "all tests pass", "exit 0", "passed"]);
}

function hasCommandEvidence(output: string): boolean {
  return includesAny(output, ["command", "commands_run", "exit_code", "exit code", "cwd", "decisive_output"]);
}
