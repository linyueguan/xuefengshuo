"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { createShareCard } from "@/lib/share-card";
import type { Intensity, Topic } from "@/lib/xuefeng";

type TopicOption = {
  id: Topic;
  title: string;
};

type IntensityOption = {
  id: Intensity;
  title: string;
  note: string;
};

const topics: TopicOption[] = [
  { id: "general", title: "通用" },
  { id: "study", title: "求学就业" },
  { id: "work", title: "职场生活" },
  { id: "reply", title: "帮我回话" },
  { id: "roast", title: "随便锐评" },
];

const intensities: IntensityOption[] = [
  {
    id: "direct",
    title: "张老师正常说",
    note: "直接，但克制",
  },
  {
    id: "sharp",
    title: "说句难听的",
    note: "拆掉自我安慰",
  },
  {
    id: "full",
    title: "火力全开",
    note: "短句、追问、段子",
  },
];

const examples = [
  "张老师什么冰棍最好吃。",
  "张老师如何评价原神。",
  "我觉得土木工程是个好专业。",
  "张老师推荐学新闻学吗。",
  "张老师你嘴唇发紫可能是心脏不好。",
  "老师你别讲了，嗓子都哑了。",
  "老板说年轻人要多吃苦，我该怎么回。",
  "我准备辞职创业，先做三个月市场调研。",
];

const loadingLines = [
  "老师正在吃玉米……",
  "正在把鸡汤里的糖滤掉",
  "正在检查你是不是只看了成功案例",
  "正在把体面话翻译成人话",
  "正在计算这件事到底谁买单",
  "正在找你计划里缺失的那一步",
  "正在把问题问对",
  "正在算普通人的现实账",
];

const placeholderAnswer = [
  "先把话扔过来，别急着替自己找台阶。",
  "我先说结论，再把时间、钱、概率和机会成本摆出来。最后问一句：这个结果，你真能承担吗？",
];

function splitAnswer(value: string) {
  const normalized = value.trim();
  const firstSentence =
    normalized.match(/^([\s\S]*?[。！？!?]+[”’"'）】》]*)/)?.[1] ??
    normalized;
  const remaining = normalized.slice(firstSentence.length).trim();

  return {
    lead: firstSentence,
    paragraphs: remaining.split(/\n{2,}/).filter(Boolean),
  };
}

export default function Home() {
  const [topic, setTopic] = useState<Topic>("general");
  const [intensity, setIntensity] = useState<Intensity>("sharp");
  const [text, setText] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [result, setResult] = useState("");
  const [resultMeta, setResultMeta] = useState<{
    topic: Topic;
    intensity: Intensity;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const shareCloseRef = useRef<HTMLButtonElement>(null);
  const shareCardUrlRef = useRef("");

  const activeTopic =
    topics.find((item) => item.id === topic) ?? topics[0];
  const activeIntensity =
    intensities.find((item) => item.id === intensity) ?? intensities[1];
  const renderedAnswer = splitAnswer(
    result || placeholderAnswer.join("\n\n"),
  );

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingLines.length);
    }, 1400);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!result || !window.matchMedia("(max-width: 899px)").matches) return;
    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [result]);

  useEffect(() => {
    shareCardUrlRef.current = shareCardUrl;
    if (shareCardUrl) {
      window.setTimeout(() => shareCloseRef.current?.focus(), 50);
    }
  }, [shareCardUrl]);

  useEffect(() => {
    function closeOnEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closeShareCard();
    }

    if (shareCardUrl) {
      window.addEventListener("keydown", closeOnEscape);
    }
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [shareCardUrl]);

  useEffect(
    () => () => {
      if (shareCardUrlRef.current) {
        URL.revokeObjectURL(shareCardUrlRef.current);
      }
    },
    [],
  );

  async function requestGeneration(nextIntensity = intensity) {
    const value = text.trim();
    if (loading) return;

    if (value.length < 4) {
      setError("至少写 4 个字，老师才知道从哪儿开讲。");
      textareaRef.current?.focus();
      return;
    }

    setIntensity(nextIntensity);
    setLoading(true);
    setLoadingIndex(Math.floor(Math.random() * loadingLines.length));
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/say", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: value,
          topic,
          intensity: nextIntensity,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "老师这会儿没接上话，再来一次。");
      }

      setLastInput(value);
      setResult(data.result);
      setResultMeta({ topic, intensity: nextIntensity });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "这会儿没接上话，再来一次。",
      );
    } finally {
      setLoading(false);
    }
  }

  function askTeacher(event: FormEvent) {
    event.preventDefault();
    void requestGeneration();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void requestGeneration();
    }
  }

  function fillExample(example: string) {
    setText(example);
    setError("");
    window.setTimeout(() => {
      document
        .querySelector("#translator")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      textareaRef.current?.focus({ preventScroll: true });
    }, 20);
  }

  function adjustIntensity(direction: -1 | 1) {
    const currentIndex = intensities.findIndex(
      (item) => item.id === intensity,
    );
    const nextIndex = Math.max(
      0,
      Math.min(intensities.length - 1, currentIndex + direction),
    );
    void requestGeneration(intensities[nextIndex].id);
  }

  async function copyResult() {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result);
    } catch {
      const helper = document.createElement("textarea");
      helper.value = result;
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      document.body.appendChild(helper);
      helper.select();
      const copiedWithFallback = document.execCommand("copy");
      helper.remove();
      if (!copiedWithFallback) {
        setError("浏览器没允许复制，请长按结果手动复制。");
        return;
      }
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function generateScreenshot() {
    if (!result || captureLoading) return;

    setCaptureLoading(true);
    setError("");
    try {
      const blob = await createShareCard({
        original: lastInput,
        result,
        logoUrl: `${window.location.origin}/xuefeng-logo.png`,
      });
      if (shareCardUrlRef.current) {
        URL.revokeObjectURL(shareCardUrlRef.current);
      }
      const nextUrl = URL.createObjectURL(blob);
      shareCardUrlRef.current = nextUrl;
      setShareCardUrl(nextUrl);
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "截图生成失败，请再试一次。",
      );
    } finally {
      setCaptureLoading(false);
    }
  }

  function closeShareCard() {
    const currentUrl = shareCardUrlRef.current;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    shareCardUrlRef.current = "";
    setShareCardUrl("");
  }

  const resultTopic =
    topics.find((item) => item.id === resultMeta?.topic)?.title ??
    activeTopic.title;
  const resultIntensity =
    intensities.find((item) => item.id === resultMeta?.intensity)?.title ??
    activeIntensity.title;

  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>

      <header className="topbar">
        <nav className="nav-inner" aria-label="主导航">
          <a className="brand" href="#top" aria-label="雪峰说首页">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo"
              src="/xuefeng-logo.png"
              width="42"
              height="42"
              alt="雪峰说 Logo"
            />
            <span className="brand-name">雪峰说</span>
            <span className="brand-tag">张雪峰skill</span>
          </a>
          <a className="nav-link" href="#recipe">
            玩法说明
            <span aria-hidden="true">↓</span>
          </a>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero" id="top">
          <div className="hero-grid">
            <div className="hero-folio" aria-hidden="true">
              <span>VOL. 01</span>
              <i />
              <span>现实表达实验</span>
            </div>

            <div className="hero-body">
              <p className="hero-kicker">
                <span aria-hidden="true">●</span>
                娱乐表达转换器
              </p>
              <h1>
                <span>张老师</span>会怎么说？
              </h1>
              <p className="hero-copy hero-copy-desktop">
                输入一句普通话，张老师来帮你说。
                <br />
                先说结论，再算现实账，最后反问一句。
              </p>
              <p className="hero-copy hero-copy-mobile">
                输入一句话，看看张老师怎么说。
              </p>
              <p className="hero-disclaimer">
                仅模拟公开表达特征，与本人及相关机构无关。
              </p>
            </div>

            <aside className="hero-note" aria-label="表达原则">
              <span>EDITOR&apos;S NOTE</span>
              <p>
                先把话说明白，
                <br />
                再谈体面。
              </p>
              <i aria-hidden="true">别端着</i>
            </aside>
          </div>
        </section>

        <section
          className="translator"
          id="translator"
          aria-label="张式表达转换器"
        >
          <div className="translator-heading">
            <span>把普通话翻译成张式表达</span>
            <span>01 / 开麦</span>
          </div>
          <span className="translator-hand-note" aria-hidden="true">
            先别找补
          </span>

          <div className="translator-grid">
            <form className="input-panel" onSubmit={askTeacher}>
              <fieldset className="control-group intensity-group">
                <legend>表达强度</legend>
                <div className="intensity-options">
                  {intensities.map((item) => (
                    <button
                      type="button"
                      className="intensity-option"
                      key={item.id}
                      aria-pressed={intensity === item.id}
                      onClick={() => setIntensity(item.id)}
                    >
                      <span>{item.title}</span>
                      <small>{item.note}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="input-label" htmlFor="plain-text">
                你想说什么？
              </label>
              <div className="textarea-shell">
                <textarea
                  id="plain-text"
                  ref={textareaRef}
                  value={text}
                  maxLength={500}
                  onChange={(event) => {
                    setText(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="把你的话、计划、借口或纠结扔进来……"
                  aria-describedby="input-meta input-disclaimer"
                />
                <div className="input-meta" id="input-meta">
                  <span>⌘ / Ctrl + Enter 也能开麦</span>
                  <span>{text.length} / 500</span>
                </div>
              </div>

              <fieldset className="control-group scene-group">
                <legend>
                  场景
                  <span>可选，默认通用</span>
                </legend>
                <div className="scene-options">
                  {topics.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={topic === item.id}
                      onClick={() => setTopic(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                className="primary-action"
                type="submit"
                disabled={text.trim().length < 4 || loading}
                aria-busy={loading}
              >
                <span>
                  {loading
                    ? loadingLines[loadingIndex]
                    : "张老师，您说两句"}
                </span>
                <span className="action-mark" aria-hidden="true">
                  {loading ? <span className="spinner" /> : "→"}
                </span>
              </button>

              {error ? (
                <p className="form-message error-message" role="alert">
                  {error}
                </p>
              ) : (
                <p
                  className="form-message input-disclaimer"
                  id="input-disclaimer"
                >
                  仅用于语言娱乐。输入会经过安全检测，生成内容请自行判断。
                </p>
              )}
            </form>

            <article
              className={`result-panel ${result ? "has-result" : "is-empty"}`}
              ref={resultRef}
              aria-live="polite"
              aria-busy={loading}
            >
              <div className="result-topline">
                <span>
                  <i aria-hidden="true" />
                  {loading
                    ? loadingLines[loadingIndex]
                    : result
                      ? "老师开麦了"
                      : "等你递话"}
                </span>
                <span>
                  {resultTopic} · {resultIntensity}
                </span>
              </div>

              {result ? (
                <div className="original-block">
                  <span>你的原话</span>
                  <p>{lastInput}</p>
                </div>
              ) : null}

              <div className="teacher-block">
                <div className="teacher-label">
                  <span>张老师说的道理</span>
                  <span>AI 表达</span>
                </div>
                <div className="answer-copy">
                  <p className="answer-lead">{renderedAnswer.lead}</p>
                  {renderedAnswer.paragraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 16)}-${index}`}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {result ? (
                <div className="result-actions" aria-label="结果操作">
                  <button
                    type="button"
                    onClick={() => void requestGeneration()}
                    disabled={loading}
                  >
                    再来一版
                  </button>
                  <button
                    className="action-emphasis"
                    type="button"
                    onClick={() => adjustIntensity(1)}
                    disabled={loading}
                  >
                    再狠一点
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustIntensity(-1)}
                    disabled={loading}
                  >
                    收着点说
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyResult()}
                    disabled={loading}
                  >
                    {copied ? "复制成功" : "复制"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateScreenshot()}
                    disabled={loading || captureLoading}
                  >
                    {captureLoading ? "正在排版…" : "生成截图"}
                  </button>
                </div>
              ) : (
                <p className="result-hint">
                  结果会保留原话对照，方便复制，也方便生成分享卡片。
                </p>
              )}
            </article>
          </div>
        </section>

        <section className="examples-section" id="examples">
          <div className="section-heading">
            <span>02 / 随手一试</span>
            <h2>不知道说什么？拿这些试试</h2>
            <p>点一下只会填入，不会自动生成，也不会消耗接口次数。</p>
            <i className="section-scribble" aria-hidden="true">
              随便点
            </i>
          </div>
          <div className="example-list" aria-label="示例输入">
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                onClick={() => fillExample(example)}
              >
                <span>{example}</span>
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </section>

        <section className="recipe-section" id="recipe">
          <div className="recipe-layout">
            <div className="section-heading recipe-heading">
              <span>03 / 玩法说明</span>
              <h2>张老师配方</h2>
              <p>没有玄学，就是把问题按顺序说清楚。</p>
            </div>
            <div className="recipe-list">
              <article>
                <span>01</span>
                <h3>先下结论</h3>
                <p>不绕弯，先告诉你问题在哪。</p>
              </article>
              <article>
                <span>02</span>
                <h3>算现实账</h3>
                <p>把时间、钱、概率和机会成本摆出来。</p>
              </article>
              <article>
                <span>03</span>
                <h3>反问收尾</h3>
                <p>最后问一句：这个结果你真能承担吗？</p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/xuefeng-logo.png"
            width="32"
            height="32"
            alt="雪峰说 Logo"
          />
          <span>雪峰说</span>
        </div>
        <p>AI 表达实验 · 非本人原话 · 不构成升学、职业或医疗建议</p>
        <a href="#top">回到顶部 ↑</a>
      </footer>

      {shareCardUrl ? (
        <div
          className="share-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeShareCard();
          }}
        >
          <section
            className="share-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
          >
            <div className="share-dialog-heading">
              <div>
                <span>1080 × 1440 PNG</span>
                <h2 id="share-dialog-title">分享卡片已经排好</h2>
              </div>
              <button
                ref={shareCloseRef}
                type="button"
                onClick={closeShareCard}
                aria-label="关闭分享卡片预览"
              >
                ×
              </button>
            </div>
            <div className="share-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shareCardUrl} alt="雪峰说分享卡片预览" />
            </div>
            <div className="share-dialog-actions">
              <a href={shareCardUrl} download="雪峰说-张老师说的道理.png">
                下载 PNG
              </a>
              <button type="button" onClick={closeShareCard}>
                先不下载
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
