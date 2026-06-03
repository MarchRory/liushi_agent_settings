#!/usr/bin/env node
import { readStdinJson } from "./lib/read-stdin-json.ts";
import { allowPermissionRequest, denyPermissionRequest } from "./lib/hook-response.ts";
import { loadSafetyPolicy } from "./lib/policy-loader.ts";
import { runMain } from "./lib/run-main.ts";
import { commandMatchesAny, getDestructiveCommandPatterns } from "./lib/tool-classifier.ts";
import { flattenText, includesAny } from "./lib/text-patterns.ts";
import type { StringList } from "./lib/types.ts";

runMain(async () => {
  const input = await readStdinJson();
  const policy = loadSafetyPolicy();
  const text = flattenText(input);
  const command = input.command ?? input.tool_input?.command ?? input.toolInput?.command ?? text;

  const lowRiskCommands = [
    "git status",
    "git diff",
    "npm run validate",
    "npm run check:sync",
    "npm run test:sync-cli",
    "npm run validate:static",
    "npm run test:hooks",
  ];

  const destructivePatterns = getDestructiveCommandPatterns(policy);
  const highRiskSignals = [
    "deploy",
    "delete",
    "drop",
    "truncate",
    "raw secret",
    "secret values",
    "reading raw secret",
  ];

  if (input._parseError) {
    denyPermissionRequest(`Malformed permission request input: ${input._parseError}`);
  } else if (lowRiskCommands.some((allowed) => normalizeCommand(command) === allowed)) {
    allowPermissionRequest("Low-risk validation or inspection command allowed by harness policy.");
  } else if (isHighRiskRequest(command, text, destructivePatterns, highRiskSignals) && !hasApprovalRecord(text, policy.gates?.approval_record_required_fields ?? [])) {
    denyPermissionRequest("High-risk operation requires explicit approval record with operation, target, reason, risk, and safer alternative.");
  } else {
    allowPermissionRequest("Permission request allowed; no high-risk pattern requiring denial was detected.");
  }
});

function normalizeCommand(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/\s+/gu, " ").trim();
}

function isHighRiskRequest(commandText: unknown, fullText: string, destructiveCommandPatterns: StringList, highRiskSignals: StringList): boolean {
  return commandMatchesAny(commandText, destructiveCommandPatterns) || includesAny(fullText, highRiskSignals);
}

function hasApprovalRecord(textValue: string, fields: StringList): boolean {
  const aliases: Record<string, string[]> = {
    exact_target_path_or_resource: ["exact_target_path_or_resource", "exact target", "target path", "target resource"],
    safer_alternative_considered: ["safer_alternative_considered", "safer alternative"],
  };
  return fields.every((field: string) => {
    const candidates = aliases[field] ?? [field];
    return candidates.some((candidate: string) => includesAny(textValue, [candidate.replaceAll("_", " "), candidate]));
  });
}
