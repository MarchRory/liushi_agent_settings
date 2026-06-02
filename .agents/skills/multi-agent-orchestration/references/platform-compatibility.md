# Platform Compatibility

## Runtime

- Requires Node.js 18+ and npm.
- Uses TypeScript run through the skill-local `tsx` dependency.
- Parses TOML with the pinned `smol-toml` package and YAML examples with the pinned `yaml` package.
- Reads JSON context files after stripping an optional UTF-8 BOM, so Windows-created UTF-8 files work.
- Does not call shell-specific commands, network APIs, Codex, or subagent runtimes.

## Commands

Install dependencies from the skill directory:

```bash
cd .agents/skills/multi-agent-orchestration
npm ci
```

Validate and run examples:

```bash
npm run typecheck
npm run validate
npm run examples
npm run fixtures
npm run wrappers
npm run select -- --context-file context.json
```

The same npm commands work in Windows PowerShell, macOS Bash/Zsh, and Linux shells when run from the skill directory.

From the repository root, run the full validation spine:

```bash
npm run validate
```

## Repository Hygiene

- `.gitattributes` keeps scripts, Markdown, TOML, YAML, and JSON line endings stable across Windows and macOS.
- `.gitignore` excludes dependency folders, generated caches, and common OS metadata.
