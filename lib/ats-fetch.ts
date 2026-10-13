const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const ATS_HOSTS = new Set([
  "boards-api.greenhouse.io", "api.lever.co", "api.ashbyhq.com", "api.smartrecruiters.com",
]);

export async function fetchATSJson(url: string, init?: RequestInit): Promise<unknown> {
  const target = new URL(url);
  if (target.protocol !== "https:" || target.username || target.password || target.port ||
      !(ATS_HOSTS.has(target.hostname) || /^[a-z0-9-]+\.wd\d+\.myworkdayjobs\.com$/.test(target.hostname))) {
    throw new Error("Unsupported ATS destination.");
  }
  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (!headers.has("user-agent")) headers.set("user-agent", "PoojaCareerOS/1.1");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init?.signal?.aborted) controller.abort();
  else init?.signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, FETCH_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("ATS source returned HTTP " + response.status + ".");
    const claimed = response.headers.get("content-length");
    if (claimed !== null && (!/^\d+$/.test(claimed) || Number(claimed) > MAX_RESPONSE_BYTES)) {
      throw new Error("ATS response exceeds the supported size or has invalid length.");
    }
    if (!response.body) throw new Error("ATS source returned no JSON body.");
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) throw new Error("ATS response exceeds 16 MiB.");
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally {
    // Abort/cancel also covers failures detected before response-body consumption.
    controller.abort();
    if (reader) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
    clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abort);
  }
}
