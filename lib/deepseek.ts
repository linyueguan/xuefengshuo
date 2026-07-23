const RETRY_DELAY_MS = 800;
const REQUEST_TIMEOUT_MS = 45_000;

type RetryOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
};

function shouldRetryStatus(status: number) {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function retryDelay(response: Response) {
  const header = response.headers.get("retry-after");
  if (!header) return RETRY_DELAY_MS;

  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(2_000, Math.round(seconds * 1_000));
  }

  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.min(2_000, Math.max(0, date - Date.now()));
  }

  return RETRY_DELAY_MS;
}

const defaultSleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function fetchDeepSeekWithRetry(
  input: string,
  init: RequestInit,
  options: RetryOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchImpl(input, {
          ...init,
          signal: controller.signal,
        });

        if (attempt === 0 && shouldRetryStatus(response.status)) {
          const delay = retryDelay(response);
          await response.body?.cancel();
          await sleep(delay);
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === 1 || controller.signal.aborted) throw error;
        await sleep(RETRY_DELAY_MS);
      }
    }

    throw new Error("DeepSeek request failed after retry");
  } finally {
    clearTimeout(timeout);
  }
}
