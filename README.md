<div align="center">
<h1>💻 indie-os</h1>
<p><b>专为“一人公司”与独立开发者打造的认知与决策控制中心。</b></p>
<p>
<a href="#the-problem">痛点</a> •
<a href="#the-solution">解决方案</a> •
<a href="#why-open-source">为什么开源</a> •
<a href="#roadmap">路线图</a>
</p>
</div>

## The Problem

作为独立开发者（Indie Hacker），我们通常会同时维护 3 到 5 个甚至更多的微型 SaaS、工具或 App。我们最常面对的不是单一技术难题，而是认知过载（Cognitive Overload）。

我们每天都在这些问题之间切换：

- 我昨天在那个不赚钱的项目上浪费了多少时间？
- Vercel 上的前端挂了吗？Supabase 的 API 报错率是不是变高了？
- 这个月 Stripe 的 MRR 到底是涨了还是跌了？

企业有 Backstage，运维有 Kubernetes，团队有 Jira。  
但“一人公司”不需要协作工具，我们需要的是一个“决策与认知系统”。

## The Solution

`indie-os` 不是另一个任务管理工具，而是一个管理「项目 x 服务 x 收入 x 注意力」的控制系统。它将你所有关键指标汇聚在一张总控制台上，并利用 AI 告诉你：

- 今天该干什么
- 哪个项目该继续投入
- 哪个项目该止损

### MVP 核心特性

#### Project Brain

统一的项目注册表（Registry），将你的 Repo、域名、技术栈和项目状态聚合于一处。

#### Observability

极简的基础设施探针。一眼看出哪个项目的 Frontend、DB、Cron Job 或第三方依赖处于异常状态。

#### Business Layer

接入 Stripe 等支付网关，直观展示每个项目的 MRR（月经常性收入）与你的“注意力耗时”之间的 ROI。

#### AI Copilot

这是 `indie-os` 的核心差异化能力。系统自动交叉比对你的耗时、收入、流量和错误情况，生成更接近经营建议的结论。例如：

> 你在“项目 A”上投入了本周 70% 的时间，但它 30 天 0 收入且报错率达到 15%，建议立刻设定时间止损线。

## Why Open Source

这种级别的看板需要极高的系统权限，例如：

- Vercel Token
- Stripe API Key
- GitHub Token
- 第三方监控或分析服务密钥

对于独立开发者来说，信任成本非常高。因此，`indie-os` 坚持开源核心（Open Core）：

### 绝对隐私

数据保留在你的本地或你自己的服务器上。

### Bring Your Own Keys

无论是接入第三方服务，还是使用 OpenAI / Claude 等模型进行分析，你都使用自己的 API Key。项目本身不托管你的核心资产。

## Roadmap

- [ ] Phase 1: Visibility
  - 构建 Dashboard 核心 UI
  - 支持手动录入项目状态、收入和注意力数据

- [ ] Phase 2: Automation
  - 开发 Plugins
  - 自动拉取 Vercel 部署状态、Uptime 监控与 Stripe 收入

- [ ] Phase 3: AI Copilot
  - 接入 LLM
  - 基于系统日志、收入与运行状态生成每日决策简报

## Contributing

本项目刚刚起步。如果你也是饱受“认知过载”折磨的独立开发者，欢迎在 Issues 中提出你最希望集成的第三方服务，例如：

- Platform
- Payment
- Analytics
- Monitoring

## License

MIT
