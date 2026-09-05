import { LEEKPAY_API_BASE } from "./leekpay.ts";

export interface CustomerLocation {
  readonly countryCode: string;
  readonly callingCode: string;
}

const MAX_RESPONSE_BYTES = 1024;

function cancelResponse(response: Response): void {
  void response.body?.cancel().catch(() => undefined);
}

async function readLocationResponse(
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) return null;
  const cancelReader = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener("abort", cancelReader, { once: true });
  const bytes = new Uint8Array(MAX_RESPONSE_BYTES);
  let length = 0;

  try {
    while (!signal.aborted) {
      const chunk = await reader.read();
      if (signal.aborted) return null;
      if (chunk.done) {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(
          bytes.subarray(0, length),
        );
        return JSON.parse(text) as unknown;
      }
      if (chunk.value.byteLength > MAX_RESPONSE_BYTES - length) {
        cancelReader();
        return null;
      }
      bytes.set(chunk.value, length);
      length += chunk.value.byteLength;
    }
    cancelReader();
    return null;
  } finally {
    signal.removeEventListener("abort", cancelReader);
    reader.releaseLock();
  }
}

export async function detectCustomerLocation(
  signal?: AbortSignal,
): Promise<CustomerLocation | null> {
  if (signal?.aborted) return null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 4000);

  try {
    const response = await fetch(`${LEEKPAY_API_BASE}/api/location`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    const mediaType = response.headers
      .get("content-type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();
    const contentLength = Number(response.headers.get("content-length"));
    if (
      controller.signal.aborted ||
      !response.ok ||
      mediaType !== "application/json" ||
      contentLength > MAX_RESPONSE_BYTES
    ) {
      cancelResponse(response);
      return null;
    }
    const data = await readLocationResponse(response, controller.signal);
    if (
      controller.signal.aborted ||
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data)
    ) {
      return null;
    }
    const location = data as Record<string, unknown>;
    const keys = Object.keys(location);
    if (
      keys.length !== 2 ||
      !keys.includes("countryCode") ||
      !keys.includes("callingCode") ||
      typeof location.countryCode !== "string" ||
      !/^[A-Z]{2}$/.test(location.countryCode) ||
      location.countryCode === "XX" ||
      location.countryCode === "T1" ||
      typeof location.callingCode !== "string" ||
      !/^\+[1-9][0-9]{0,2}$/.test(location.callingCode)
    ) {
      return null;
    }
    return {
      countryCode: location.countryCode,
      callingCode: location.callingCode,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
