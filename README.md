# 张老师说的道理

一个张老师式现实建议生成网站。用户可以围绕志愿、专业、考研、就业和生活选择提问，并选择回答力度。

## 本地运行

要求 Node.js `>=22.13.0`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`。

没有 `DEEPSEEK_API_KEY` 时，网站会自动使用本地演示回答。

## 环境变量

```dotenv
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
MAX_OUTPUT_TOKENS=900
```

API Key 只在服务端使用，不会发送到浏览器。不要提交真实的 `.env`、`.env.local` 或 `.dev.vars` 文件。

## Cloudflare Workers 部署

项目使用 Vinext 与 Cloudflare Vite 插件，部署配置位于 `wrangler.jsonc`。

```bash
npx wrangler login
npx wrangler secret put DEEPSEEK_API_KEY
npm run deploy
```

如果暂时不配置 DeepSeek 密钥，也可以直接部署演示模式：

```bash
npm run deploy
```

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run deploy
```

## 说明

本项目是 AI 表达实验，生成内容不是张雪峰本人原话。升学、就业与政策信息请以最新官方资料为准。
