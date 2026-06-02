import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function getPaths(metaUrl = import.meta.url) {
  const scriptDir = dirname(fileURLToPath(metaUrl));
  const packageRoot = resolve(scriptDir, "..");
  const repoRoot = findRepoRoot(packageRoot);
  return {
    repoRoot,
    packageRoot,
    codexSource: join(repoRoot, "packages", "codex-config", "src", ".codex"),
    codexRoot: join(repoRoot, ".codex"),
    datasetsRoot: join(packageRoot, "datasets"),
    rubricsRoot: join(packageRoot, "rubrics"),
    schemasRoot: join(packageRoot, "schemas"),
  };
}

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) continue;
    const [rawKey, inlineValue] = value.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
      args[rawKey] = argv[i + 1];
      i += 1;
    } else {
      args[rawKey] = true;
    }
  }
  return args;
}

export function resolveRepoPath(repoRoot, value) {
  if (!value) return null;
  return isAbsolute(value) ? value : join(repoRoot, value);
}

export function assertSafeOutputTarget(paths, targetPath) {
  const resolved = resolve(targetPath);
  const relPath = rel(paths.repoRoot, resolved);
  if (relPath.startsWith("..") || isAbsolute(relPath)) {
    throw new Error(`output target must stay inside repository root: ${targetPath}`);
  }
  const allowedRoots = [".codex-eval-runs/", ".codex-eval-reports/"];
  const normalized = relPath.replaceAll("\\", "/");
  if (!allowedRoots.some((root) => normalized === root.slice(0, -1) || normalized.startsWith(root))) {
    throw new Error(`output target must be under ignored eval output roots: ${allowedRoots.join(", ")}`);
  }
  const check = spawnSync("git", ["check-ignore", "-q", "--", normalized], {
    cwd: paths.repoRoot,
    stdio: "ignore",
    shell: false,
  });
  if (check.status !== 0) {
    throw new Error(`output target is not ignored by git: ${normalized}`);
  }
}

export function readText(path) {
  return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

export function writeJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeText(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, value, "utf8");
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function listFiles(root, extension = null) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listFiles(path, extension));
    } else if (!extension || extname(path) === extension || path.endsWith(extension)) {
      files.push(path);
    }
  }
  return files.sort();
}

export function readJsonl(path) {
  const records = [];
  const failures = [];
  const lines = readText(path).split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      records.push({ record: JSON.parse(trimmed), line: index + 1, file: path });
    } catch (error) {
      failures.push(`${path}:${index + 1}: invalid JSONL: ${error.message}`);
    }
  });
  return { records, failures };
}

export function loadKnownAgents(paths) {
  const sourceAgents = join(paths.codexSource, "agents");
  const files = listFiles(sourceAgents, ".toml").filter((file) => !file.endsWith("config.toml"));
  return files.map((file) => {
    const text = readText(file);
    const name = text.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] ?? basenameNoExt(file);
    return { name, sourceFile: file, rootFile: join(paths.codexRoot, "agents", `${name}.toml`) };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function loadEvalTasks(paths) {
  const files = listFiles(paths.datasetsRoot, ".jsonl");
  const failures = [];
  const tasks = [];
  for (const file of files) {
    const parsed = readJsonl(file);
    failures.push(...parsed.failures.map((failure) => rel(paths.repoRoot, failure)));
    for (const item of parsed.records) tasks.push(item);
  }
  return { files, tasks, failures };
}

export function rel(repoRoot, path) {
  return relative(repoRoot, path).replaceAll("\\", "/");
}

export function scoreRate(passed, total) {
  if (total === 0) return 0;
  return Number((passed / total).toFixed(4));
}

export function nowIso() {
  return new Date().toISOString();
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function findRepoRoot(start) {
  let current = resolve(start);
  while (true) {
    if (existsSync(join(current, "package.json")) && existsSync(join(current, "packages"))) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error(`could not find repository root from ${start}`);
    current = parent;
  }
}

function basenameNoExt(path) {
  return path.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
}
