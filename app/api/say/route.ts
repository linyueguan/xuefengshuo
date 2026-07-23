import { fetchDeepSeekWithRetry } from "@/lib/deepseek";
import { detectPromptInjection } from "@/lib/prompt-injection";
import {
  buildUserPrompt,
  cleanModelOutput,
  createDemoAnswer,
  SYSTEM_PROMPT,
  type Intensity,
  type Topic,
} from "@/lib/xuefeng";

const topics = new Set<Topic>([
  "application",
  "postgraduate",
  "roast",
  "care",
]);
const intensities = new Set<Intensity>(["direct", "sharp", "full"]);

type RequestBody = {
  text?: unknown;
  topic?: unknown;
  intensity?: unknown;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "输入格式不对，重新说一遍。" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const topic =
    typeof body.topic === "string" && topics.has(body.topic as Topic)
      ? (body.topic as Topic)
      : null;
  const intensity =
    typeof body.intensity === "string" &&
    intensities.has(body.intensity as Intensity)
      ? (body.intensity as Intensity)
      : null;

  if (text.length < 4 || text.length > 500 || !topic || !intensity) {
    return Response.json(
      { error: "把问题说具体一点，控制在 4 到 500 个字。" },
      { status: 400 },
    );
  }

  const injection = detectPromptInjection(text);
  if (injection.detected) {
    return Response.json(
      {
        error:
          "这个输入包含试图改变回答规则的指令，请只保留你想咨询的问题。",
        code: "PROMPT_INJECTION",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  if (!apiKey) {
    return Response.json({
      result: createDemoAnswer(text, topic, intensity),
      demo: true,
    });
  }

  try {
    const response = await fetchDeepSeekWithRetry(
      "https://api.deepseek.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
          temperature: 0.78,
          max_tokens: Number(process.env.MAX_OUTPUT_TOKENS || 900),
          stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserPrompt(text, topic, intensity) },
          ],
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`model-status-${response.status}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    const result = cleanModelOutput(data.choices?.[0]?.message?.content || "");

    if (!result) {
      throw new Error("empty-model-output");
    }

    return Response.json({ result, demo: false });
  } catch {
    return Response.json({
      result: createDemoAnswer(text, topic, intensity),
      demo: true,
    });
  }
}
