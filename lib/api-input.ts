export class ApiInputError extends Error {
  readonly status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.status = status;
  }
}

const MAX_BYTES = 1024 * 1024;

export async function readApiObject(request: Request): Promise<Record<string, unknown>> {
  const claimed = request.headers.get("content-length");
  if (claimed !== null && !/^\d+$/.test(claimed)) {
    throw new ApiInputError("Invalid Content-Length.");
  }
  if (claimed !== null && Number(claimed) > MAX_BYTES) {
    throw new ApiInputError("Request exceeds 1 MiB.", 413);
  }
  if (!request.body) throw new ApiInputError("A JSON object is required.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ApiInputError("Request exceeds 1 MiB.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiInputError("Provide valid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiInputError("A JSON object is required.");
  }
  return body as Record<string, unknown>;
}

export function textField(body: Record<string, unknown>, name: string, max = 50_000): string {
  const value = body[name];
  if (value === undefined) return "";
  if (typeof value !== "string") throw new ApiInputError(name + " must be a string.");
  if (value.length > max) throw new ApiInputError(name + " is too long.", 413);
  return value.trim();
}

export function booleanField(body: Record<string, unknown>, name: string): boolean {
  const value = body[name];
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new ApiInputError(name + " must be a boolean.");
  return value;
}

export function jobLimit(body: Record<string, unknown>): number {
  const value = body.maxJobs;
  if (value === undefined) return 100;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 500) {
    throw new ApiInputError("maxJobs must be an integer from 1 to 500.");
  }
  return value;
}

export function resumeMode(body: Record<string, unknown>): "balanced" | "ats" | "concise" | "impact" {
  const value = body.mode;
  if (value === undefined) return "balanced";
  if (value !== "balanced" && value !== "ats" && value !== "concise" && value !== "impact") {
    throw new ApiInputError("Unsupported resume mode.");
  }
  return value;
}
