type InjectionRule = {
  id: string;
  pattern: RegExp;
};

const injectionRules: InjectionRule[] = [
  {
    id: "override-instructions-zh",
    pattern:
      /(?:忽略|无视|跳过|覆盖|忘掉|抛弃).{0,16}(?:之前|以上|前面|原有|系统|开发者).{0,12}(?:指令|提示词?|规则|要求|消息)/i,
  },
  {
    id: "reveal-prompt-zh",
    pattern:
      /(?:输出|显示|泄露|透露|打印|复述|重复|告诉我).{0,20}(?:系统提示词?|隐藏指令|开发者消息|内部规则|原始提示词?)/i,
  },
  {
    id: "role-switch-zh",
    pattern:
      /(?:从现在开始|接下来).{0,8}(?:你是|扮演|切换为|进入).{0,20}(?:开发者模式|无限制模式|越狱|dan\b)/i,
  },
  {
    id: "override-instructions-en",
    pattern:
      /\b(?:ignore|disregard|override|forget|bypass)\b.{0,40}\b(?:previous|prior|above|system|developer)\b.{0,24}\b(?:instructions?|prompts?|rules?|messages?)\b/i,
  },
  {
    id: "reveal-prompt-en",
    pattern:
      /\b(?:reveal|show|print|repeat|expose|leak)\b.{0,32}\b(?:system prompt|developer message|hidden instructions?|internal rules?)\b/i,
  },
  {
    id: "role-marker",
    pattern:
      /(?:<\|(?:system|developer|assistant)\|>|(?:^|\n)\s*#{0,3}\s*(?:system|developer)\s*:|\[(?:system|developer)\])/i,
  },
  {
    id: "jailbreak",
    pattern: /\b(?:jailbreak|developer mode|do anything now|dan mode)\b/i,
  },
];

function normalizeForDetection(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function detectPromptInjection(value: string) {
  const normalized = normalizeForDetection(value);
  const matched = injectionRules.find((rule) => rule.pattern.test(normalized));

  return {
    detected: Boolean(matched),
    rule: matched?.id,
  };
}
