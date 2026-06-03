export async function readStdinJson() {
    const input = await readStdin();
    if (!input.trim())
        return {};
    try {
        return JSON.parse(input);
    }
    catch (error) {
        return {
            hookEventName: "Unknown",
            _parseError: error instanceof Error ? error.message : String(error),
            _rawInput: input,
        };
    }
}
function readStdin() {
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
