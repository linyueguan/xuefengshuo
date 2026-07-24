# 雪峰说

一个娱乐化的“张式表达”转换器。输入一句普通话，选择表达强度，
即可生成直接、现实、短句、反问和段子感更强的说法。

生成结果支持重新生成、升降火力、复制，以及在浏览器端生成
`1080 × 1440` 的 PNG 分享卡片。本站仅模拟公开表达特征，与本人及相关机构无关。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`。

没有 `DEEPSEEK_API_KEY` 时，网站会自动使用本地演示回答。接口仍会经过
Durable Object 限流和 Prompt 注入检测。

## 环境变量

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
MAX_OUTPUT_TOKENS=900
```

API Key 只在服务端使用，不会发送到浏览器。不要提交真实的 `.env`、`.env.local` 或 `.dev.vars` 文件。

## Cloudflare Workers 部署

项目使用 Vinext 与 Cloudflare Vite 插件，部署配置位于 `wrangler.jsonc`。
首次部署会根据迁移配置自动创建 SQLite Durable Object 命名空间。

```bash
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
npm run deploy
```

连接 Cloudflare Workers Builds 与 GitHub 后，推送仓库即可触发同一套构建和部署。

## 接口保护

- 输入长度：4 到 500 个字符。
- 单 IP 限制：每 10 分钟 12 次。
- 每日限制：每个 IP 按上海自然日 60 次。
- API Key：只从 Cloudflare Worker 服务端 Secret 读取。
- 请求超时：包含重试在内的 DeepSeek 调用总计 45 秒。
- 异常重试：网络错误、超时、限流和服务端错误自动重试一次。
- Prompt 注入：高置信度规则预检，并在系统提示词中把用户输入标记为不可信数据。

限流使用 Durable Object 做跨 Cloudflare 节点的一致计数。若限流绑定异常，接口返回
`503`，不会绕过保护继续消耗 API Key。

## 网站 Skill

网站的表达框架已适配自
[`alchaincyf/zhangxuefeng-skill`](https://github.com/alchaincyf/zhangxuefeng-skill)。
上游文本快照保存在 `skills/zhangxuefeng-perspective/`，Cloudflare 实际运行的
精简、安全适配版位于 `lib/zhangxuefeng-perspective.ts`，并由
`lib/xuefeng.ts` 合并网站输出合同后发送给 DeepSeek。

运行时保留选择匹配、就业倒推、中位数、不可替代性、家庭条件与最坏情况等
思维框架；不会加载上游传记或时间线作为回答事实，也不会改变现有限流、安全
检测和 API 参数。

如果暂时不配置 DeepSeek 密钥，也可以直接部署演示模式：

```bash
npm run deploy
```

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run deploy
```

## 说明

本项目是 AI 表达实验，生成内容不是张雪峰本人原话，不构成升学、职业或医疗建议。
