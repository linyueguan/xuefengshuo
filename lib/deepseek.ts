const RETRY_DELAY_MS = 800;
const FIRST_ATTEMPT_TIMEOUT_MS = 22_000;
const TOTAL_REQUEST_TIMEOUT_MS = 45_000;

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

function timeoutError() {
  return new DOMException("DeepSeek request timed out", "TimeoutError");
}

async function waitBeforeRetry(
  milliseconds: number,
  deadline: number,
  sleep: (milliseconds: number) => Promise<void>,
) {
  const remaining = deadline - Date.now();
  if (remaining <= 1) throw timeoutError();
  await sleep(Math.min(milliseconds, remaining - 1));
}

export async function fetchDeepSeekWithRetry(
  input: string,
  init: RequestInit,
  options: RetryOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const deadline = Date.now() + TOTAL_REQUEST_TIMEOUT_MS;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw timeoutError();

    const controller = new AbortController();
    const attemptTimeout = setTimeout(
      () => controller.abort(),
      attempt === 0
        ? Math.min(FIRST_ATTEMPT_TIMEOUT_MS, remaining)
        : remaining,
    );

    try {
      const response = await fetchImpl(input, {
        ...init,
        signal: controller.signal,
      });

      if (attempt === 0 && shouldRetryStatus(response.status)) {
        const delay = retryDelay(response);
        await response.body?.cancel();
        await waitBeforeRetry(delay, deadline, sleep);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === 1) throw error;
      await waitBeforeRetry(RETRY_DELAY_MS, deadline, sleep);
    } finally {
      clearTimeout(attemptTimeout);
    }
  }

  throw new Error("DeepSeek request failed after retry");
}
