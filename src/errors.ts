// Turn an OpenRouter error response into a short, readable message.
// Raw body shape: {"error":{"code","message"},"metadata":{"raw": "<json issues[]>"}}
// where raw issues may nest further issues under `errors` (invalid_union).

type Issue = {
  code?: string;
  message?: string;
  path?: (string | number)[];
  errors?: Issue[][];
};

function describeIssue(issue: Issue, indent: string): string[] {
  const path = issue.path?.length ? issue.path.join(".") : "(root)";
  const lines = [`${indent}- ${path}: ${issue.message ?? issue.code ?? "invalid"}`];
  const nested = new Set<string>();
  for (const group of issue.errors ?? []) {
    for (const inner of group) {
      if (inner.message) nested.add(inner.message);
    }
  }
  for (const msg of nested) lines.push(`${indent}    · ${msg}`);
  return lines;
}

function parseRawIssues(raw: unknown): Issue[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [{ message: value }];
    }
  }
  return Array.isArray(value) ? (value as Issue[]) : [];
}

export function formatOpenRouterError(status: number, body: string): string {
  let parsed: any;
  try {
    parsed = JSON.parse(body);
  } catch {
    return `OpenRouter ${status}: ${body.trim() || "(empty body)"}`;
  }

  const err = parsed?.error ?? {};
  const head = `OpenRouter ${status}${err.code ? ` ${err.code}` : ""}: ${err.message ?? "request failed"}`;
  const issues = parseRawIssues(parsed?.metadata?.raw);
  const lines = issues.flatMap((issue) => describeIssue(issue, "  "));
  return [head, ...lines].join("\n");
}
