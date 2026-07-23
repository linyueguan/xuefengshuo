"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Intensity, Topic } from "@/lib/xuefeng";

type TopicOption = {
  id: Topic;
  title: string;
  shortTitle: string;
  prompt: string;
  examples: string[];
};

const topics: TopicOption[] = [
  {
    id: "application",
    title: "志愿与专业",
    shortTitle: "志愿",
    prompt: "把省份、分数或位次、家庭条件和目标说具体。",
    examples: [
      "普通家庭，孩子想学金融，到底该不该报？",
      "想留在省内，计算机和临床医学怎么选？",
    ],
  },
  {
    id: "postgraduate",
    title: "考研与就业",
    shortTitle: "考研",
    prompt: "说清本科、目标岗位、城市和能承担的时间成本。",
    examples: [
      "双非本科，考研是不是唯一的翻身机会？",
      "为了进大厂，应该先考研还是先实习？",
    ],
  },
  {
    id: "roast",
    title: "生活锐评",
    shortTitle: "锐评",
    prompt: "把你纠结的事原样扔进来，别先替自己找台阶。",
    examples: [
      "工作不喜欢，但又舍不得稳定，怎么办？",
      "朋友总说先享受生活，我是不是太焦虑了？",
    ],
  },
  {
    id: "care",
    title: "直播间关心",
    shortTitle: "关心",
    prompt: "比如“老师你是不是累了”，看老师怎么反压回来。",
    examples: [
      "老师你看起来太累了，还是早点休息吧。",
      "老师你嗓子都哑了，今天别讲了。",
    ],
  },
];

const intensities: Array<{ id: Intensity; title: string; note: string }> = [
  { id: "direct", title: "直接说", note: "结论优先" },
  { id: "sharp", title: "说句难听的", note: "默认火力" },
  { id: "full", title: "火力全开", note: "连续追问" },
];

const loadingLines = [
  "正在把问题问对",
  "正在算普通人的现实账",
  "正在把小概率赶回小概率",
  "正在给你留一条退路",
];

const starterAnswer = [
  "先别急着问“该不该”。",
  "把家庭条件、目标岗位、城市和能承受的试错成本摆出来，答案才有资格出现。",
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
  const [topic, setTopic] = useState<Topic>("application");
  const [intensity, setIntensity] = useState<Intensity>("sharp");
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const activeTopic = topics.find((item) => item.id === topic) ?? topics[0];

  const activeIntensity =
    intensities.find((item) => item.id === intensity) ?? intensities[1];

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setLoadingIndex((current) => (current + 1) % loadingLines.length);
    }, 1250);
    return () => window.clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (!result) return;
    if (window.matchMedia("(max-width: 767px)").matches) {
      window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }
  }, [result]);

  function selectTopic(nextTopic: Topic) {
    setTopic(nextTopic);
    setResult("");
    setError("");
    setCopied(false);
    setShared(false);
  }

  async function askTeacher(event?: FormEvent) {
    event?.preventDefault();
    const value = text.trim();
    if (value.length < 4 || loading) return;

    setLoading(true);
    setLoadingIndex(0);
    setError("");
    setCopied(false);
    setShared(false);

    try {
      const response = await fetch("/api/say", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, topic, intensity }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: string;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "老师这会儿没接上话，再点一次。");
      }
      setResult(data.result);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "这会儿没接上话，再点一次。",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void askTeacher();
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("浏览器没允许复制，长按结果手动复制。");
    }
  }

  async function shareResult() {
    if (!result) return;
    const shareData = {
      title: "张老师说的道理",
      text: result,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${result}\n\n${window.location.href}`);
      }
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      // Cancelling the native share sheet should stay quiet.
    }
  }

  const displayedAnswer = splitAnswer(result || starterAnswer.join("\n\n"));

  return (
    <div className="site-shell">
      <header className="nav-wrap">
        <nav className="nav-island" aria-label="主导航">
          <a className="brand" href="#top" aria-label="张老师说的道理首页">
            <span className="brand-orb" aria-hidden="true" />
            <span>张老师说的道理</span>
          </a>
          <a className="nav-link" href="#examples">
            看看怎么问
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <h1>
            你把条件说清楚
            <span>我替你摊开</span>
          </h1>
          <p className="hero-copy">
            不拿专业名字当就业合同，不拿成功个例替普通家庭下注
            <br />
            先看出口，再谈理想
          </p>
        </section>

        <section className="experience" aria-label="张老师回答生成器">
          <div className="experience-core">
            <form className="question-panel" onSubmit={askTeacher}>
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">01 · 把话说明白</span>
                  <h2>想听张老师说点什么？</h2>
                </div>
                <span className="word-count">{text.length}/500</span>
              </div>

              <div className="topic-tabs" aria-label="选择问题场景">
                {topics.map((item) => (
                  <button
                    className="topic-tab"
                    type="button"
                    key={item.id}
                    aria-pressed={topic === item.id}
                    onClick={() => selectTopic(item.id)}
                  >
                    <span className="topic-full">{item.title}</span>
                    <span className="topic-short">{item.shortTitle}</span>
                  </button>
                ))}
              </div>

              <label className="input-shell">
                <span className="sr-only">输入你的问题</span>
                <textarea
                  value={text}
                  maxLength={500}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={activeTopic.prompt}
                  aria-describedby="input-hint"
                />
                <span className="input-command" id="input-hint">
                  ⌘ Enter
                </span>
              </label>

              <div className="intensity-block">
                <div className="control-label">
                  <span>今天说多重</span>
                  <span>{activeIntensity.note}</span>
                </div>
                <div className="intensity-tabs" aria-label="选择回答力度">
                  {intensities.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={intensity === item.id}
                      onClick={() => setIntensity(item.id)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="primary-action"
                type="submit"
                disabled={text.trim().length < 4 || loading}
              >
                <span>{loading ? loadingLines[loadingIndex] : "张老师说两句"}</span>
                <span className="action-orb" aria-hidden="true">
                  {loading ? <span className="spinner" /> : "↗"}
                </span>
              </button>

              {error ? (
                <p className="error-message" role="alert">
                  {error}
                </p>
              ) : (
                <p className="privacy-note">
                  不保存你的输入。真实升学与就业信息，请以最新官方资料为准。
                </p>
              )}
            </form>

            <div
              className={`answer-panel ${result ? "has-result" : ""}`}
              ref={resultRef}
              aria-live="polite"
            >
              <div className="answer-topline">
                <span className="answer-state">
                  <span aria-hidden="true" />
                  {result ? "老师开麦了" : "回答会从这里开始"}
                </span>
                <span>{activeTopic.title}</span>
              </div>

              <div className="answer-body">
                <div className="quote-mark" aria-hidden="true">
                  张
                </div>
                <div className="answer-copy">
                  <p className="answer-lead">{displayedAnswer.lead}</p>
                  {displayedAnswer.paragraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 12)}-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div className="answer-actions">
                <button type="button" onClick={copyResult} disabled={!result}>
                  {copied ? "已复制" : "复制回答"}
                </button>
                <button type="button" onClick={shareResult} disabled={!result}>
                  {shared ? "已准备分享" : "分享"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="examples-section" id="examples">
          <div className="section-heading">
            <span className="panel-kicker">02 · 别问空话</span>
            <h2>条件越具体，判断越值钱</h2>
          </div>
          <div className="example-scroller">
            {activeTopic.examples.map((example) => (
              <button
                type="button"
                className="example-card"
                key={example}
                onClick={() => {
                  setText(example);
                  window.scrollTo({ top: 260, behavior: "smooth" });
                }}
              >
                <span>{example}</span>
                <span className="example-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
            <div className="principle-card">
              <span>判断顺序</span>
              <strong>就业出口 → 家庭成本 → 城市机会 → 升级退路</strong>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <span>AI 表达实验 · 非本人原话</span>
        <span>把刀口对准幻想，不对准人的尊严</span>
      </footer>
    </div>
  );
}
