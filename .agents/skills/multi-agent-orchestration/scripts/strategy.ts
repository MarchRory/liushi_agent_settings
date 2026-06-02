#!/usr/bin/env node
import { buildPacket, parseContextArg, printJson, validateRegistry } from "./lib/strategy_common.js";

const strategyId = process.argv[2];
if (!strategyId || strategyId.startsWith("--")) {
  console.error("Usage: tsx scripts/strategy.ts <strategy-id> [--validate] [--context JSON] [--context-file path]");
  process.exit(2);
}

const parsed = parseContextArg(process.argv.slice(3));
if (parsed.validate) {
  const errors = validateRegistry();
  printJson({ valid: errors.length === 0, errors });
  process.exit(errors.length === 0 ? 0 : 1);
}

printJson(buildPacket(strategyId, parsed.context));
