#!/usr/bin/env node
import { readStdinJson } from "./lib/read-stdin-json.mjs";
import { block, pass } from "./lib/hook-response.mjs";
import { loadValidationPolicy } from "./lib/policy-loader.mjs";
import { flattenText, includesAny } from "./lib/text-patterns.mjs";
const input = await readStdinJson();
const policy = loadValidationPolicy();
const text = flattenText(input.final_response ?? input.finalResponse ?? input.last_assistant_message ?? input.message ?? input.output ?? input);
const reason = checkFinalResponse(text, policy);
if (reason)
    block(reason);
else
    pass();
function checkFinalResponse(output, validationPolicy) {
    if (!output.trim())
        return null;
    if (claimsTestsPassed(output) && !hasCommandEvidence(output))
        return "Final response claims tests passed without command, result, and exit code evidence.";
    if (impliesChangedFiles(output) && !listsChangedFiles(output)) {
        return "Final response implies file changes but does not list changed files.";
    }
    if (impliesMeaningfulChange(output) && !hasValidationRecord(output, validationPolicy.reporting?.required_fields ?? [])) {
        return "Final response after meaningful changes lacks a structured validation record.";
    }
    if (mentionsNotRun(output) && !hasNotRunFields(output, validationPolicy.not_run_requires ?? [])) {
        return "Final response validation.not_run lacks required reason, recommended_command, or risk.";
    }
    if (mentionsHighRisk(output) && !hasApprovalRecord(output))
        return "Final response describes high-risk operation without approval record.";
    return null;
}
function claimsTestsPassed(output) {
    return includesAny(output, ["tests passed", "all tests pass", "npm run validate passed", "validation passed", "validate passed"]);
}
function hasCommandEvidence(output) {
    return hasCommandReference(output) && includesAny(output, ["exit_code", "exit code"]) && includesAny(output, ["result"]);
}
function hasCommandReference(output) {
    return includesAny(output, ["commands_run", "commands run", "command", "npm run", "pnpm ", "node ", "git diff --check"]);
}
function impliesChangedFiles(output) {
    if (statesNoFileChanges(output))
        return false;
    return includesAny(output, ["changed", "modified", "updated", "implemented", "patched", "edited", "added files", "new files"]);
}
function listsChangedFiles(output) {
    return includesAny(output, ["changed files", "changed_files", "files changed"]);
}
function impliesMeaningfulChange(output) {
    return impliesChangedFiles(output) || (includesAny(output, ["commit", "patch", "files changed"]) && !statesNoFileChanges(output));
}
function statesNoFileChanges(output) {
    return includesAny(output, ["no files changed", "no file changes", "did not change files", "read-only", "readonly"]);
}
function hasValidationRecord(output, requiredFields) {
    if (!includesAny(output, ["validation"]))
        return false;
    if (!hasCommandEvidence(output))
        return false;
    return requiredFields.every((field) => includesAny(output, fieldAliases(field)));
}
function fieldAliases(field) {
    const aliases = {
        commands_run: ["commands_run", "commands run", "command"],
        unverified_risks: ["unverified_risks", "unverified risks", "residual risk", "risk"],
    };
    return aliases[field] ?? [field, field.replaceAll("_", " ")];
}
function mentionsNotRun(output) {
    return includesAny(output, ["validation.status = not_run", "status: \"not_run\"", "status: not_run", "status not_run"]);
}
function hasNotRunFields(output, fields) {
    return fields.every((field) => includesAny(output, [field, field.replaceAll("_", " ")]));
}
function mentionsHighRisk(output) {
    return includesAny(output, ["rm -rf", "git reset --hard", "terraform destroy", "kubectl delete", "drop database", "truncate", "raw secret", "destructive"]);
}
function hasApprovalRecord(output) {
    return includesAny(output, ["approval record"]) && includesAny(output, ["operation"]) && includesAny(output, ["risk"]) && includesAny(output, ["safer alternative"]);
}
