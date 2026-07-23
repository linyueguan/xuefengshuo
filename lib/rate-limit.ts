export const RATE_WINDOW_LIMIT = 12;
export const RATE_WINDOW_MS = 10 * 60 * 1_000;
export const RATE_DAILY_LIMIT = 60;

type RateState = {
  windowStartedAt: number;
  windowCount: number;
  day: string;
  dailyCount: number;
};

export type RateLimitResult = {
  allowed: boolean;
  reason?: "window" | "day";
  windowRemaining: number;
  dailyRemaining: number;
  retryAfterSeconds: number;
};

export type RateLimiterNamespace = {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
};

function shanghaiDay(timestamp: number) {
  return new Date(timestamp + 8 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 10);
}

function secondsUntilShanghaiMidnight(timestamp: number) {
  const shifted = new Date(timestamp + 8 * 60 * 60 * 1_000);
  const nextMidnight =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + 1,
    ) -
    8 * 60 * 60 * 1_000;

  return Math.max(1, Math.ceil((nextMidnight - timestamp) / 1_000));
}

function clientIp(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp.slice(0, 64);

  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim();
  if (forwardedIp) return forwardedIp.slice(0, 64);

  return "unknown";
}

export class RateLimiter {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    const now = Date.now();
    const day = shanghaiDay(now);

    const result = await this.state.storage.transaction(async (transaction) => {
      const stored = await transaction.get<RateState>("rate");
      const current: RateState = stored ?? {
        windowStartedAt: now,
        windowCount: 0,
        day,
        dailyCount: 0,
      };

      if (current.day !== day) {
        current.day = day;
        current.dailyCount = 0;
      }

      if (now - current.windowStartedAt >= RATE_WINDOW_MS) {
        current.windowStartedAt = now;
        current.windowCount = 0;
      }

      if (current.dailyCount >= RATE_DAILY_LIMIT) {
        return {
          allowed: false,
          reason: "day",
          windowRemaining: Math.max(
            0,
            RATE_WINDOW_LIMIT - current.windowCount,
          ),
          dailyRemaining: 0,
          retryAfterSeconds: secondsUntilShanghaiMidnight(now),
        } satisfies RateLimitResult;
      }

      if (current.windowCount >= RATE_WINDOW_LIMIT) {
        return {
          allowed: false,
          reason: "window",
          windowRemaining: 0,
          dailyRemaining: Math.max(
            0,
            RATE_DAILY_LIMIT - current.dailyCount,
          ),
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(
              (current.windowStartedAt + RATE_WINDOW_MS - now) / 1_000,
            ),
          ),
        } satisfies RateLimitResult;
      }

      current.windowCount += 1;
      current.dailyCount += 1;
      await transaction.put("rate", current);

      return {
        allowed: true,
        windowRemaining: RATE_WINDOW_LIMIT - current.windowCount,
        dailyRemaining: RATE_DAILY_LIMIT - current.dailyCount,
        retryAfterSeconds: 0,
      } satisfies RateLimitResult;
    });

    return Response.json(result);
  }
}

export async function checkRequestRateLimit(
  request: Request,
  namespace: RateLimiterNamespace | undefined,
) {
  if (!namespace) {
    throw new Error("RATE_LIMITER binding is unavailable");
  }

  const id = namespace.idFromName(clientIp(request));
  const response = await namespace
    .get(id)
    .fetch("https://rate-limiter.internal/check", { method: "POST" });

  if (!response.ok) {
    throw new Error(`RATE_LIMITER returned ${response.status}`);
  }

  return (await response.json()) as RateLimitResult;
}
