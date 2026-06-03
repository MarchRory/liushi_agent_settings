#!/usr/bin/env node
import { readStdinJson } from "./lib/read-stdin-json.mjs";
import { denyPreToolUse, pass, warnPreToolUse } from "./lib/hook-response.mjs";
import { loadSafetyPolicy } from "./lib/policy-loader.mjs";
import { commandMatchesAny, getCommandText, getDestructiveCommandPatterns, getToolName, getWriteTargets, isBashTool, isWriteTool, pathMatchesAny, } from "./lib/tool-classifier.mjs";
import { flattenText, includesAny, normalizePath } from "./lib/text-patterns.mjs";
const input = await readStdinJson();
const policy = loadSafetyPolicy();
const toolName = getToolName(input);
const command = getCommandText(input);
const targets = getWriteTargets(input).map(normalizePath);
const destructivePatterns = getDestructiveCommandPatterns(policy);
const sensitivePaths = [
    ...(policy.sensitive_paths ?? []),
    ".env",
    ".env.*",
    "*.pem",
    "id_rsa",
    "terraform.tfstate",
    ".npmrc",
    ".pypirc",
];
const guardedHarnessPaths = [".harness/policies/*", ".codex/hooks/*"];
if (input._parseError) {
    denyPreToolUse(`Blocked malformed hook input: ${input._parseError}`);
}
else if (isBashTool(toolName) && commandMatchesAny(command, destructivePatterns)) {
    denyPreToolUse("Blocked destructive command by harness safety policy.");
}
else if (isWriteTool(toolName) && targets.some((target) => pathMatchesAny(target, sensitivePaths))) {
    denyPreToolUse("Blocked sensitive path write by harness safety policy.");
}
else if (isWriteTool(toolName) && targets.some((target) => pathMatchesAny(target, guardedHarnessPaths)) && !hasPolicyOrHookTaskContext(input)) {
    denyPreToolUse("Blocked policy or hook modification without explicit policy/hook task context.");
}
else if (isWriteTool(toolName) && targets.some((target) => pathMatchesAny(target, guardedHarnessPaths))) {
    warnPreToolUse("This tool call touches a policy or hook surface. Record validation and approval status before final delivery.");
}
else {
    pass();
}
function hasPolicyOrHookTaskContext(value) {
    const text = flattenText(value);
    return includesAny(text, [
        "policy modification",
        "modify policy",
        "policy task",
        "hook modification",
        "modify hook",
        "hook foundation",
        "hooks foundation",
        "codex hook",
        "codex hooks",
        "sprint 1",
    ]);
}
