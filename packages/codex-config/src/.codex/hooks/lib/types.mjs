export function asRecord(value) {
    return value !== null && typeof value === "object" ? value : {};
}
