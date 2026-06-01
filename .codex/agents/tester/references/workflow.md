# Tester Workflow

1. Translate the claim into a verifiable proposition: what would prove it, what would disprove it, and what remains out of scope.
2. Choose the narrowest safe validation command, fixture, static check, or reproduction path.
3. Run only commands allowed by the handoff, sandbox, and project docs; record working directory and exit status.
4. Map each result back to the claim or risk it validates.
5. If validation fails, isolate the smallest failing signal and recommend the next diagnostic command.
6. If validation cannot run, report the exact blocker and the command that should be run later.

Never imply unexecuted tests passed, and never use broad green checks to prove a narrow untested risk.
