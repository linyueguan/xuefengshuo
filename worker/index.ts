/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  checkRequestRateLimit,
  type RateLimitResult,
  type RateLimiterNamespace,
} from "../lib/rate-limit";

export { RateLimiter } from "../lib/rate-limit";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RATE_LIMITER: RateLimiterNamespace;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function rateHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Window-Remaining": String(result.windowRemaining),
    "X-RateLimit-Daily-Remaining": String(result.dailyRemaining),
  };
}

function withRateHeaders(response: Response, result: RateLimitResult) {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(rateHeaders(result))) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handleRateLimitedApi(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
) {
  let rateLimit: RateLimitResult;

  try {
    rateLimit = await checkRequestRateLimit(request, env.RATE_LIMITER);
  } catch (error) {
    console.error("Rate limiter unavailable", error);
    return Response.json(
      {
        error: "服务暂时无法确认调用次数，请稍后再试。",
        code: "RATE_LIMIT_UNAVAILABLE",
      },
      { status: 503 },
    );
  }

  if (!rateLimit.allowed) {
    return Response.json(
      {
        error:
          rateLimit.reason === "day"
            ? "今天的调用次数已经用完，明天再来。"
            : "请求太频繁，歇一会儿再试。",
        code: "RATE_LIMITED",
        reason: rateLimit.reason,
        windowRemaining: rateLimit.windowRemaining,
        dailyRemaining: rateLimit.dailyRemaining,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          ...rateHeaders(rateLimit),
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const response = await handler.fetch(request, env, ctx);
  return withRateHeaders(response, rateLimit);
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/say" && request.method === "POST") {
      return handleRateLimitedApi(request, env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
