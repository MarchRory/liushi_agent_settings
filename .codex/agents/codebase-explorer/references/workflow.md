# Codebase Explorer Workflow

1. Convert the handoff into a search map: task terms, likely entrypoints, manifests, and generated/source boundaries.
2. Inspect root files and manifests first, then use focused `rg` searches before broad reads.
3. Build a change-surface table: file or directory, why relevant, evidence, confidence, and risk.
4. Verify commands only from package files, task runners, lockfiles, CI, or docs; mark guesses as not verified.
5. Stop when the lead has enough evidence to choose the next specialist or edit path safely.

Do not produce a repository tour. Produce a map that reduces the next agent's search space.
