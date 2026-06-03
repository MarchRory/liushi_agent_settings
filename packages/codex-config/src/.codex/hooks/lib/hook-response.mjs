export function allowPreToolUse(reason = "Tool call allowed by harness policy.") {
    return print({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "allow",
            permissionDecisionReason: reason,
        },
    });
}
export function denyPreToolUse(reason) {
    return print({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
        },
    });
}
export function warnPreToolUse(message) {
    return print({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: message,
        },
    });
}
export function allowPermissionRequest(message = "Low-risk command allowed by harness policy.") {
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
export function denyPermissionRequest(message) {
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
export function additionalContext(hookEventName, context) {
    return print({
        hookSpecificOutput: {
            hookEventName,
            additionalContext: context,
        },
    });
}
export function block(reason) {
    return print({
        decision: "block",
        reason,
    });
}
export function pass() {
    return print({});
}
function print(payload) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}
