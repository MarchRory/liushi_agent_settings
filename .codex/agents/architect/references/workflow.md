# Architect Workflow

1. Restate the architectural decision, public contract, and user-visible success criteria.
2. Identify affected interfaces, lifecycle stages, package boundaries, compatibility constraints, and rollback surfaces.
3. Compare the smallest viable design against one simpler option and one more extensible option.
4. Choose the design with the clearest migration path, smallest reversible slice, and lowest long-term maintenance risk.
5. Name validation gates tied to the design's actual failure modes.

Reject designs that require broad rewrites without measured payoff, migration evidence, and rollback strategy.
