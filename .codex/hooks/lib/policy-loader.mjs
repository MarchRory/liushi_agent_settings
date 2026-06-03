import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const hookRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = findRepoRoot(hookRoot);
export function loadSafetyPolicy() {
    return (readPolicy("safety.yaml").safety_policy ?? {});
}
export function loadValidationPolicy() {
    return (readPolicy("validation.yaml").validation_policy ?? {});
}
export function getRepoRoot() {
    return repoRoot;
}
function readPolicy(fileName) {
    const sourcePath = join(repoRoot, "packages", "harness", "src", ".harness", "policies", fileName);
    const rootPath = join(repoRoot, ".harness", "policies", fileName);
    const path = existsSync(sourcePath) ? sourcePath : rootPath;
    if (!existsSync(path))
        throw new Error(`missing harness policy ${fileName} under ${repoRoot}`);
    return parseSimpleYaml(readFileSync(path, "utf8"));
}
function findRepoRoot(start) {
    let current = resolve(start);
    while (true) {
        if (existsSync(join(current, ".harness", "policies")) ||
            (existsSync(join(current, "package.json")) && existsSync(join(current, "packages", "harness")))) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current)
            throw new Error(`could not find repository root from ${start}`);
        current = parent;
    }
}
function parseSimpleYaml(source) {
    const lines = source
        .replace(/^\uFEFF/u, "")
        .split(/\r?\n/u)
        .map((raw) => ({ indent: raw.match(/^ */u)?.[0].length ?? 0, text: raw.trim() }))
        .filter((line) => line.text.length > 0 && !line.text.startsWith("#"));
    const [value] = parseBlock(lines, 0, 0);
    return value ?? {};
}
function parseBlock(lines, index, indent) {
    if (index >= lines.length || lines[index].indent < indent)
        return [undefined, index];
    if (lines[index].indent === indent && lines[index].text.startsWith("- "))
        return parseSequence(lines, index, indent);
    return parseMapping(lines, index, indent);
}
function parseSequence(lines, index, indent) {
    const values = [];
    let cursor = index;
    while (cursor < lines.length && lines[cursor].indent === indent && lines[cursor].text.startsWith("- ")) {
        const rest = lines[cursor].text.slice(2).trim();
        cursor += 1;
        if (rest.length === 0) {
            const [child, next] = parseBlock(lines, cursor, indent + 2);
            values.push(child ?? {});
            cursor = next;
        }
        else {
            values.push(parseScalar(rest));
        }
    }
    return [values, cursor];
}
function parseMapping(lines, index, indent) {
    const value = {};
    let cursor = index;
    while (cursor < lines.length && lines[cursor].indent === indent && !lines[cursor].text.startsWith("- ")) {
        const match = lines[cursor].text.match(/^([^:]+):(.*)$/u);
        if (!match)
            throw new Error(`unsupported YAML line: ${lines[cursor].text}`);
        const key = match[1].trim();
        const rest = match[2].trim();
        cursor += 1;
        if (rest.length === 0) {
            const [child, next] = parseBlock(lines, cursor, indent + 2);
            value[key] = child ?? {};
            cursor = next;
        }
        else {
            value[key] = parseScalar(rest);
        }
    }
    return [value, cursor];
}
function parseScalar(value) {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    if (trimmed === "true")
        return true;
    if (trimmed === "false")
        return false;
    if (/^-?\d+(?:\.\d+)?$/u.test(trimmed))
        return Number(trimmed);
    return trimmed;
}
