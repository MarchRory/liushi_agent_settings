import { flattenText, matchesGlobLike, normalizePath, normalizeText } from "./text-patterns.mjs";
import { asRecord } from "./types.mjs";
export function getToolName(input) {
    return input.tool_name ?? input.toolName ?? input.name ?? input.tool?.name ?? "";
}
export function getToolInput(input) {
    return asRecord(input.tool_input ?? input.toolInput ?? input.input ?? input.arguments ?? input.tool?.input);
}
export function getCommandText(input) {
    const toolInput = getToolInput(input);
    return toolInput.command ?? toolInput.cmd ?? toolInput.script ?? input.command ?? flattenText(toolInput);
}
export function getWriteTargets(input) {
    const toolInput = getToolInput(input);
    const values = [
        toolInput.path,
        toolInput.file,
        toolInput.file_path,
        toolInput.filePath,
        toolInput.target,
        input.path,
        input.file_path,
        input.target,
    ];
    const patchTargets = extractPatchTargets(toolInput.patch ?? input.patch ?? "");
    return [...values.filter(Boolean).map(normalizePath), ...patchTargets];
}
export function isWriteTool(toolName) {
    return /^(apply_patch|edit|write)$/iu.test(toolName) || /^mcp__/iu.test(toolName);
}
export function isBashTool(toolName) {
    return /^(bash|shell|terminal)$/iu.test(toolName);
}
export function commandMatches(command, pattern) {
    const value = normalizeCommand(command);
    const target = normalizeCommand(pattern);
    if (target === "git clean -fd")
        return /\bgit\s+clean\s+-(?:f?d|df)\b/u.test(value);
    if (target === "git clean -xfd")
        return /\bgit\s+clean\s+-(?:x?f?d|x?d?f|f?x?d|f?d?x|d?f?x|d?x?f)\b/u.test(value);
    return value.includes(target);
}
export function getDestructiveCommandPatterns(policy) {
    return [
        ...(policy.destructive_command_patterns?.filesystem ?? []),
        ...(policy.destructive_command_patterns?.git ?? []),
        ...(policy.destructive_command_patterns?.database ?? []),
        ...(policy.destructive_command_patterns?.containers_and_cloud ?? []),
        "git push --force",
        "npm publish",
        "pnpm publish",
    ];
}
export function commandMatchesAny(command, patterns) {
    return patterns.some((pattern) => commandMatches(command, pattern));
}
export function pathMatchesAny(path, patterns) {
    return patterns.some((pattern) => matchesGlobLike(path, pattern));
}
function normalizeCommand(value) {
    return normalizeText(value).replace(/\s+/gu, " ").trim();
}
function extractPatchTargets(patch) {
    const text = String(patch ?? "");
    const paths = [];
    for (const line of text.split(/\r?\n/u)) {
        const match = line.match(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/u);
        if (match)
            paths.push(normalizePath(match[1]));
    }
    return paths;
}
