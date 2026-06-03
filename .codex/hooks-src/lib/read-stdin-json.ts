import type { HookInput } from "./types.js";

export async function readStdinJson(): Promise<HookInput> {
  const input = await readStdin();
  if (!input.trim()) return {};
  try {
    return JSON.parse(input) as HookInput;
  } catch (error) {
    return {
      hookEventName: "Unknown",
      _parseError: error instanceof Error ? error.message : String(error),
      _rawInput: input,
    };
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}
