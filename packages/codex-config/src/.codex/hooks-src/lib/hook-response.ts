import type { LooseRecord } from "./types.js";

export function allowPreToolUse(reason = "Tool call allowed by harness policy."): void {
  return print({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: reason,
    },
  });
}

export function denyPreToolUse(reason: string): void {
  return print({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  });
}

export function warnPreToolUse(message: string): void {
  return print({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: message,
    },
  });
}

export function allowPermissionRequest(message = "Low-risk command allowed by harness policy."): void {
  return print({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "allow",
        message,
      },
    },
  });
}

export function denyPermissionRequest(message: string): void {
  return print({
    hookSpecificOutput: {
      hookEventName: "PermissionRequest",
      decision: {
        behavior: "deny",
        message,
      },
    },
  });
}

export function additionalContext(hookEventName: string, context: string): void {
  return print({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: context,
    },
  });
}

export function block(reason: string): void {
  return print({
    decision: "block",
    reason,
  });
}

export function pass(): void {
  return print({});
}

function print(payload: LooseRecord): void {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
