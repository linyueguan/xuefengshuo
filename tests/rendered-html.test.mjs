import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker;
}

const runtime = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const context = {
  waitUntil() {},
  passThroughOnException() {},
};

test("server-renders the renamed experience without retired copy", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    runtime,
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>张老师说的道理｜先看出口，再谈理想<\/title>/);
  assert.match(html, /张老师说的道理首页/);
  assert.match(html, /你负责把条件说清楚/);
  assert.match(html, /现实，我替你摊开/);
  assert.match(html, /想听张老师说点什么？/);
  assert.match(html, /张老师说两句/);

  const retiredCopy = [
    "雪峰老师" + "怎么说",
    "问题" + "校准器",
    "让老师" + "说两句",
    "你负责把条件说清楚" + "。",
    "现实，我替你摊开" + "。",
  ];
  for (const copy of retiredCopy) {
    assert.ok(!html.includes(copy));
  }
});

test("returns a demo answer when no DeepSeek secret is configured", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/api/say", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "普通家庭应该怎么选专业",
        topic: "application",
        intensity: "sharp",
      }),
    }),
    runtime,
    context,
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.demo, true);
  assert.equal(typeof body.result, "string");
  assert.ok(body.result.length > 100);
});
