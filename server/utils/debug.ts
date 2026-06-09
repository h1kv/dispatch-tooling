const shouldDebug = process.env.NODE_ENV !== "production";

const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  gray: "\x1b[90m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
};

function formatValue(value: unknown): unknown {
  if (typeof value === "number") return Number(value.toFixed(2));
  if (Array.isArray(value)) return `[${value.join(",")}]`;
  if (typeof value === "string" && value.includes(" ")) return `"${value}"`;
  return value;
}

function colorFor(event: string): string {
  if (event.includes("invalid") || event.includes("ignored")) return colors.red;
  if (event === "close") return colors.yellow;
  if (event === "connection" || event === "join") return colors.green;
  if (event.startsWith("cursor:")) return colors.gray;
  return colors.cyan;
}

export function debug(event: string, details: Record<string, unknown> = {}): void {
  if (!shouldDebug) return;
  const fields = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${formatValue(v)}`)
    .join(" ");
  const color = colorFor(event);
  const suffix = fields ? ` ${colors.dim}${fields}${colors.reset}` : "";
  console.log(`${color}[ws] ${event}${colors.reset}${suffix}`);
}
