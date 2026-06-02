#!/usr/bin/env node
import { parseContextArg, printJson, selectStrategy, validateRegistry } from "./lib/strategy_common.js";

const parsed = parseContextArg(process.argv.slice(2));

if (parsed.validate) {
  const errors = validateRegistry();
  printJson({ valid: errors.length === 0, errors });
  process.exit(errors.length === 0 ? 0 : 1);
}

printJson(selectStrategy(parsed.context));
