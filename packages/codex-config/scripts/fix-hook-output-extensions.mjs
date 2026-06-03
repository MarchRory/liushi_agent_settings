#!/usr/bin/env node
import { existsSync, readdirSync, renameSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const hooksDir = join(process.cwd(), "src", ".codex", "hooks");

for (const file of listFiles(hooksDir, ".js")) {
  const target = file.slice(0, -3) + ".mjs";
  renameSync(file, target);
}

for (const file of listFiles(hooksDir, ".mjs")) {
  const source = readFileSync(file, "utf8");
  const updated = source.replace(/from "([^"]+)\.js"/gu, 'from "$1.mjs"');
  if (updated !== source) writeFileSync(file, updated);
}

function listFiles(root, extension) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) files.push(...listFiles(path, extension));
    else if (path.endsWith(extension)) files.push(path);
  }
  return files.sort();
}
