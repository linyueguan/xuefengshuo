# 网站运行时适配

此目录保留
[`alchaincyf/zhangxuefeng-skill`](https://github.com/alchaincyf/zhangxuefeng-skill)
的文本源文件，便于审阅和后续同步。

Cloudflare Workers 不会在请求时读取仓库里的 Markdown。网站实际发送给
DeepSeek 的运行时版本位于：

- `lib/zhangxuefeng-perspective.ts`：从上游提取的稳定思维框架与表达规则；
- `lib/xuefeng.ts`：网站输出格式、强度、安全和旧接口兼容规则。

适配原则：

- 保留选择匹配、就业倒推、中位数、不可替代性、家庭条件、城市和最坏情况等核心框架；
- 保留结论优先、短句、追问、现实账和可执行动作；
- 不把传记、争议、人物时间线或示例对话当成现实事实；
- 不声称生成内容为本人原话、授权内容或最新表态；
- 网站运行时无法联网搜索，涉及时效数据时只提示核对当年官方材料，不编造数字；
- 继续使用现有 DeepSeek 请求、限流、Prompt 注入检测和演示回退逻辑。
