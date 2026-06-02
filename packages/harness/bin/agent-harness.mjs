#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const harnessSource = join(packageRoot, "src");

const args = process.argv.slice(2);
const command = args[0];
const options = parseOptions(args.slice(1));

if (!["sync", "check"].includes(command)) {
  fail(usage());
}
if (command === "check" && options.write) fail("--write is only valid with sync");
if (options.write && options.dryRun) fail("--write and --dry-run cannot be used together");

const targetRoot = resolve(options.target ?? process.cwd());
const adapterRoot = resolve(options.adapter ?? join(packageRoot, "..", "codex-config"));
const adapterSource = join(adapterRoot, "src");
const config = {
  deleteExtra: options.deleteExtra ?? false,
  dryRun: command === "check" || !options.write,
  overlays: (options.overlays ?? []).map((overlay) => resolve(overlay)),
  targetIgnore: createIgnoreMatcher(readHarnessIgnore(targetRoot)),
};

const mappings = [
  { source: join(harnessSource, "AGENTS.md"), target: join(targetRoot, "AGENTS.md"), targetRel: "AGENTS.md" },
  { source: join(harnessSource, ".agents"), target: join(targetRoot, ".agents"), targetRel: ".agents" },
  { source: join(harnessSource, ".harness"), target: join(targetRoot, ".harness"), targetRel: ".harness", ignoreRootScripts: true },
  { source: join(packageRoot, "scripts"), target: join(targetRoot, ".harness", "scripts"), targetRel: ".harness/scripts" },
  { source: join(harnessSource, "docs", "harness"), target: join(targetRoot, "docs", "harness"), targetRel: "docs/harness" },
  {
    source: join(harnessSource, "docs", "validation-spine.md"),
    target: join(targetRoot, "docs", "validation-spine.md"),
    targetRel: "docs/validation-spine.md",
  },
  { source: join(adapterSource, ".codex"), target: join(targetRoot, ".codex"), targetRel: ".codex" },
];

for (const mapping of mappings) {
  if (!existsSync(mapping.source)) fail(`missing source: ${display(mapping.source)}`);
}
for (const overlay of config.overlays) {
  if (!existsSync(overlay) || !isDirectory(overlay)) fail(`missing overlay directory: ${display(overlay)}`);
}

const beforeDiffs = checkAllMappings();
if (config.dryRun) {
  report(beforeDiffs.length === 0, beforeDiffs, { changed: beforeDiffs.length > 0 });
}

for (const mapping of mappings) syncMapping(mapping);
const afterDiffs = checkAllMappings();
report(afterDiffs.length === 0, afterDiffs, { changed: beforeDiffs.length > 0, checkedBeforeWrite: true });

function syncMapping(mapping) {
  const entries = sourceEntries(mapping);
  if (entries.size === 0) return;

  if (isDirectory(mapping.source)) {
    mkdirSync(mapping.target, { recursive: true });
    if (config.deleteExtra && existsSync(mapping.target) && isDirectory(mapping.target)) {
      for (const targetFile of targetFiles(mapping)) {
        if (!entries.has(targetFile.relPath)) rmSync(targetFile.path, { force: true });
      }
    }
    for (const entry of entries.values()) copyFile(entry.source, targetPath(mapping, entry.relPath));
  } else {
    const entry = entries.get("");
    if (entry) copyFile(entry.source, mapping.target);
  }
}

function checkAllMappings() {
  const diffs = [];
  for (const mapping of mappings) diffs.push(...checkMapping(mapping));
  return diffs;
}

function checkMapping(mapping) {
  const diffs = [];
  const entries = sourceEntries(mapping);
  if (entries.size === 0) return diffs;

  if (!existsSync(mapping.target)) {
    diffs.push({ type: "missing_target", path: display(mapping.target), source: display(mapping.source) });
    return diffs;
  }

  if (isDirectory(mapping.source) !== isDirectory(mapping.target)) {
    diffs.push({ type: "kind_mismatch", path: display(mapping.target), source: display(mapping.source) });
    return diffs;
  }

  if (!isDirectory(mapping.source)) {
    const entry = entries.get("");
    if (entry) compareFile(entry.source, mapping.target, diffs);
    return diffs;
  }

  const targetSet = new Map(targetFiles(mapping).map((file) => [file.relPath, file.path]));
  for (const entry of entries.values()) {
    const targetFile = targetPath(mapping, entry.relPath);
    if (!targetSet.has(entry.relPath)) diffs.push({ type: "missing_target", path: display(targetFile), source: display(entry.source) });
    else compareFile(entry.source, targetFile, diffs);
  }

  if (config.deleteExtra) {
    for (const targetFile of targetSet.values()) {
      const relPath = normalize(relative(mapping.target, targetFile));
      if (!entries.has(relPath)) diffs.push({ type: "extra_target", path: display(targetFile) });
    }
  }

  return diffs;
}

function sourceEntries(mapping) {
  const entries = new Map();
  addSourceEntries(entries, mapping, mapping.source);
  for (const overlay of config.overlays) {
    const overlaySource = join(overlay, mapping.targetRel);
    if (existsSync(overlaySource)) addSourceEntries(entries, mapping, overlaySource);
  }
  return entries;
}

function addSourceEntries(entries, mapping, sourcePath) {
  if (!existsSync(sourcePath)) return;
  if (!isDirectory(mapping.source)) {
    if (!isDirectory(sourcePath) && !isIgnoredPath(mapping, "", sourcePath)) entries.set("", { relPath: "", source: sourcePath });
    return;
  }
  if (!isDirectory(sourcePath)) return;

  for (const sourceFile of listFiles(sourcePath, mapping, sourcePath)) {
    const relPath = normalize(relative(sourcePath, sourceFile));
    if (!isIgnoredPath(mapping, relPath, sourceFile)) entries.set(relPath, { relPath, source: sourceFile });
  }
}

function targetFiles(mapping) {
  if (!existsSync(mapping.target)) return [];
  if (!isDirectory(mapping.target)) return [{ relPath: "", path: mapping.target }];
  return listFiles(mapping.target, mapping, mapping.target).map((path) => ({
    relPath: normalize(relative(mapping.target, path)),
    path,
  }));
}

function compareFile(sourceFile, targetFile, diffs) {
  if (!existsSync(targetFile)) {
    diffs.push({ type: "missing_target", path: display(targetFile), source: display(sourceFile) });
    return;
  }
  const source = readFileSync(sourceFile);
  const target = readFileSync(targetFile);
  if (!source.equals(target)) diffs.push({ type: "content_mismatch", path: display(targetFile), source: display(sourceFile) });
}

function copyFile(source, target) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source));
}

function listFiles(root, mapping, base = root) {
  if (!existsSync(root)) return [];
  if (!isDirectory(root)) return [root];
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const relPath = normalize(relative(base, path));
    if (isIgnoredPath(mapping, relPath, path)) continue;
    if (isDirectory(path)) files.push(...listFiles(path, mapping, base));
    else files.push(path);
  }
  return files.sort();
}

function isIgnoredPath(mapping, relPath, absolutePath) {
  const mappingRel = normalize(relPath);
  const rootRel = targetRootRel(mapping, mappingRel);
  if (rootRel.split("/").includes("node_modules")) return true;
  if (mapping.ignoreRootScripts && (mappingRel === "scripts" || mappingRel.startsWith("scripts/"))) return true;
  if (rootRel.startsWith(".harness/reports/live-model-ab-")) return true;
  if (rootRel.includes("/reports/live-model-ab-")) return true;
  if (absolutePath.includes(`${sep()}node_modules${sep()}`)) return true;
  return config.targetIgnore(rootRel);
}

function targetPath(mapping, relPath) {
  return relPath ? join(mapping.target, relPath) : mapping.target;
}

function targetRootRel(mapping, relPath) {
  return normalize(relPath ? join(mapping.targetRel, relPath) : mapping.targetRel);
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function readHarnessIgnore(root) {
  const path = join(root, ".agent-harnessignore");
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function createIgnoreMatcher(patterns) {
  const rules = patterns.map((raw) => {
    const pattern = normalize(raw).replace(/^\/+/u, "");
    const hasGlob = /[*?]/u.test(pattern);
    return { pattern, hasGlob, regex: hasGlob ? globToRegExp(pattern) : null };
  });
  return (rootRel) => {
    const value = normalize(rootRel).replace(/^\/+/u, "");
    return rules.some((rule) => {
      if (rule.hasGlob) return rule.regex.test(value);
      const prefix = rule.pattern.endsWith("/") ? rule.pattern : `${rule.pattern}/`;
      return value === rule.pattern.replace(/\/$/u, "") || value.startsWith(prefix);
    });
  };
}

function globToRegExp(pattern) {
  let source = "^";
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    const next = pattern[i + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      i += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += escapeRegExp(char);
  }
  source += "$";
  return new RegExp(source, "u");
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+*?.]/gu, "\\$&");
}

function parseOptions(values) {
  const parsed = { overlays: [] };
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === "--target") parsed.target = values[++i];
    else if (value === "--adapter") parsed.adapter = values[++i];
    else if (value === "--overlay") parsed.overlays.push(values[++i]);
    else if (value === "--write") parsed.write = true;
    else if (value === "--dry-run") parsed.dryRun = true;
    else if (value === "--delete-extra") parsed.deleteExtra = true;
    else if (value.startsWith("--delete-extra=")) parsed.deleteExtra = parseBoolean(value.split("=", 2)[1], "--delete-extra");
    else fail(`unknown option: ${value}`);
  }
  return parsed;
}

function parseBoolean(value, name) {
  if (value === "true") return true;
  if (value === "false") return false;
  fail(`${name} must be true or false`);
}

function normalize(value) {
  return value.replaceAll("\\", "/");
}

function sep() {
  return process.platform === "win32" ? "\\" : "/";
}

function display(path) {
  return normalize(relative(targetRoot, path));
}

function report(ok, diffs, extra = {}) {
  const payload = {
    ok,
    command,
    target: targetRoot,
    dryRun: config.dryRun,
    deleteExtra: config.deleteExtra,
    overlays: config.overlays.map((overlay) => display(overlay)),
    mappings: mappings.length,
    ...extra,
    diffs,
  };
  const output = JSON.stringify(payload, null, 2);
  if (ok) console.log(output);
  else console.error(output);
  process.exit(ok ? 0 : 1);
}

function usage() {
  return [
    "Usage: agent-harness <sync|check> --target <project-root> --adapter <codex-config-package>",
    "Options:",
    "  --write                 Required for sync to modify files; sync is dry-run by default.",
    "  --dry-run               Force sync dry-run behavior.",
    "  --delete-extra=true     Report/delete target files absent from composed source.",
    "  --delete-extra=false    Preserve target extras; this is the default.",
    "  --overlay <dir>         Apply a target-relative local overlay after package sources.",
  ].join("\n");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
