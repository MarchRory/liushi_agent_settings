export function includesAny(text, patterns) {
    const value = normalizeText(text);
    return patterns.some((pattern) => value.includes(normalizeText(pattern)));
}
export function matchesAnyRegex(text, regexes) {
    return regexes.some((regex) => regex.test(text));
}
export function normalizeText(value) {
    return String(value ?? "").toLowerCase();
}
export function flattenText(value) {
    if (value == null)
        return "";
    if (typeof value === "string")
        return value;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (Array.isArray(value))
        return value.map(flattenText).join("\n");
    if (typeof value === "object")
        return Object.values(value).map(flattenText).join("\n");
    return "";
}
export function normalizePath(value) {
    return String(value ?? "").replaceAll("\\", "/").replace(/^['"]|['"]$/g, "");
}
export function matchesGlobLike(path, pattern) {
    const normalizedPath = normalizePath(path).toLowerCase();
    const normalizedPattern = normalizePath(pattern).toLowerCase();
    if (normalizedPattern.includes("**"))
        return globToRegex(normalizedPattern).test(normalizedPath);
    if (normalizedPattern.includes("*"))
        return globToRegex(normalizedPattern).test(normalizedPath);
    return normalizedPath === normalizedPattern || normalizedPath.endsWith(`/${normalizedPattern}`);
}
function globToRegex(pattern) {
    let source = "^";
    for (let i = 0; i < pattern.length; i += 1) {
        const char = pattern[i];
        const next = pattern[i + 1];
        if (char === "*" && next === "*") {
            source += ".*";
            i += 1;
        }
        else if (char === "*")
            source += "[^/]*";
        else
            source += escapeRegExp(char);
    }
    source += "$";
    return new RegExp(source, "u");
}
function escapeRegExp(value) {
    return value.replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&");
}
