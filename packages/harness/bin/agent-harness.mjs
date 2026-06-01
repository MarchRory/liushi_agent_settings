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
  fail("Usage: agent-harness <sync|check> --target <project-root> --adapter <codex-config-package>");
}

const targetRoot = resolve(options.target ?? process.cwd());
const adapterRoot = resolve(options.adapter ?? join(packageRoot, "..", "codex-config"));
const adapterSource = join(adapterRoot, "src");

const mappings = [
  { source: join(harnessSource, "AGENTS.md"), target: join(targetRoot, "AGENTS.md") },
  { source: join(harnessSource, ".agents"), target: join(targetRoot, ".agents") },
  { source: join(harnessSource, ".harness"), target: join(targetRoot, ".harness"), ignoreRootScripts: true },
  { source: join(packageRoot, "scripts"), target: join(targetRoot, ".harness", "scripts") },
  { source: join(harnessSource, "docs", "harness"), target: join(targetRoot, "docs", "harness") },
  { source: join(harnessSource, "docs", "validation-spine.md"), target: join(targetRoot, "docs", "validation-spine.md") },
  { source: join(adapterSource, ".codex"), target: join(targetRoot, ".codex") },
];

for (const mapping of mappings) {
  if (!existsSync(mapping.source)) fail(`missing source: ${display(mapping.source)}`);
}

const diffs = [];
for (const mapping of mappings) {
  const result = command === "sync" ? syncMapping(mapping) : checkMapping(mapping);
  diffs.push(...result);
}

if (diffs.length > 0) {
  console.error(JSON.stringify({ ok: false, command, target: targetRoot, diffs }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, command, target: targetRoot, mappings: mappings.length }, null, 2));

function syncMapping(mapping) {
  const diffs = checkMapping(mapping);
  if (diffs.length === 0) return [];

  const sourceFiles = listFiles(mapping.source, mapping);
  const sourceSet = new Set(sourceFiles.map((file) => relative(mapping.source, file)));
  if (isDirectory(mapping.source)) {
    mkdirSync(mapping.target, { recursive: true });
    for (const targetFile of listFiles(mapping.target, mapping)) {
      const relPath = relative(mapping.target, targetFile);
      if (!sourceSet.has(relPath) && !isIgnored(relPath, targetFile, mapping)) {
        rmSync(targetFile, { force: true });
      }
    }
    for (const sourceFile of sourceFiles) {
      const relPath = relative(mapping.source, sourceFile);
      copyFile(sourceFile, join(mapping.target, relPath));
    }
  } else {
    copyFile(mapping.source, mapping.target);
  }

  return checkMapping(mapping);
}

function checkMapping(mapping) {
  const diffs = [];
  if (!existsSync(mapping.target)) {
    diffs.push({ type: "missing_target", path: display(mapping.target), source: display(mapping.source) });
    return diffs;
  }

  if (isDirectory(mapping.source) !== isDirectory(mapping.target)) {
    diffs.push({ type: "kind_mismatch", path: display(mapping.target), source: display(mapping.source) });
    return diffs;
  }

  if (!isDirectory(mapping.source)) {
    compareFile(mapping.source, mapping.target, diffs);
    return diffs;
  }

  const sourceFiles = listFiles(mapping.source, mapping);
  const targetFiles = listFiles(mapping.target, mapping);
  const sourceSet = new Set(sourceFiles.map((file) => normalize(relative(mapping.source, file))));
  const targetSet = new Set(
    targetFiles
      .filter((file) => !isIgnored(relative(mapping.target, file), file, mapping))
      .map((file) => normalize(relative(mapping.target, file))),
  );

  for (const relPath of sourceSet) {
    const sourceFile = join(mapping.source, relPath);
    const targetFile = join(mapping.target, relPath);
    if (!targetSet.has(relPath)) diffs.push({ type: "missing_target", path: display(targetFile), source: display(sourceFile) });
    else compareFile(sourceFile, targetFile, diffs);
  }

  for (const relPath of targetSet) {
    if (!sourceSet.has(relPath)) diffs.push({ type: "extra_target", path: display(join(mapping.target, relPath)) });
  }

  return diffs;
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
    const relPath = relative(base, path);
    if (isIgnored(relPath, path, mapping)) continue;
    if (isDirectory(path)) files.push(...listFiles(path, mapping, base));
    else files.push(path);
  }
  return files.sort();
}

function isIgnored(relPath, absolutePath, mapping = {}) {
  const normalized = normalize(relPath);
  if (normalized.split("/").includes("node_modules")) return true;
  if (mapping.ignoreRootScripts && (normalized === "scripts" || normalized.startsWith("scripts/"))) return true;
  if (normalized.startsWith("reports/live-model-ab-")) return true;
  if (normalized.includes("/reports/live-model-ab-")) return true;
  return absolutePath.includes(`${sep()}node_modules${sep()}`);
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function parseOptions(values) {
  const parsed = {};
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === "--target") parsed.target = values[++i];
    else if (value === "--adapter") parsed.adapter = values[++i];
    else fail(`unknown option: ${value}`);
  }
  return parsed;
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
