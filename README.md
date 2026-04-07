<div align="center">
  <h1>⚡ indie-os</h1>
  <p><b>The command center for indie hackers and solo founders.</b><br>Track projects, revenue, dev time, service health, and get AI-powered decisions — all in one self-hosted dashboard.</p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-integrations">Integrations</a> •
    <a href="#-screenshots">Screenshots</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/SQLite-local--first-blue?logo=sqlite" alt="SQLite" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
    <img src="https://img.shields.io/badge/self--hosted-yes-orange" alt="Self-hosted" />
  </p>
</div>

---

## The Problem

As an indie hacker running 3–5 products simultaneously, the biggest bottleneck isn't code — it's **cognitive overload**.

Every day you switch between:
- *Is my API down? Did the Vercel deploy break?*
- *Which project is actually making money this month?*
- *Am I spending 80% of my time on a product that earns $0?*

Enterprises have Datadog, Backstage, and whole DevOps teams. Solo founders have… open tabs.

**indie-os** is your personal OS for running your indie business. One dashboard. All signal. No noise.

---

## ✨ Features

### 🗂 Project Brain
Unified project registry — repo, domain, tech stack, status, all in one place. Each project gets a dedicated page with revenue, time, and ROI breakdown.

### 📊 Revenue Tracking
Log MRR, one-time payments, and refunds manually or auto-sync from Stripe. See monthly revenue trends with a built-in bar chart.

### ⏱ Time Investment
Track dev hours per project. See exactly where your attention is going, and calculate revenue-per-hour ROI across your portfolio.

### 🔌 Service Integrations

| Integration | What it tracks |
|---|---|
| **GitHub** | Stars, open issues, latest commit, CI status (Actions) |
| **Vercel** | Deployment state, framework, production URL |
| **Stripe** | MRR, active subscriptions, 30-day revenue (auto-logs to revenue) |
| **HTTP Probe** | Any URL — response time, status code, up/down/degraded |

### 🔔 Down Alerts
When an HTTP probe detects a service going down, instantly send alerts via:
- **Slack** / **Discord** (incoming webhooks)
- **Telegram** (Bot API)
- Any generic HTTP webhook

### 🤖 AI Copilot
Connect your OpenAI key and get GPT-4o-mini analysis of your portfolio: which projects to double down on, which ones to cut, based on your real data.

### 📅 Auto-sync via Cron
One URL + any cron service (e.g. [cron-job.org](https://cron-job.org) — free) syncs all integrations on a schedule. No external infrastructure needed.

### 🌐 Public Share Pages
Generate a shareable link for any project — shows revenue, dev time, ROI, and activity. Revoke anytime. Great for building in public.

### 📡 Public Status Page
One URL that shows the health of all your HTTP-monitored services. Perfect for sharing with users: *"Is the API down? Check here."*

### 🌙 Dark Mode
System-aware with manual override. Looks great both ways.

### 📱 Mobile-Friendly
Fully responsive — check your dashboard on your phone. Hamburger menu, touch-friendly layouts.

### 💾 Data Export
Export revenue or time logs as CSV, or download a full JSON backup — your data, always yours.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Git

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/qijinhaocode/indie-os.git
cd indie-os

# 2. Install dependencies
npm install

# 3. Initialize the database
npm run db:push

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). That's it — no environment variables required to get started.

### Production (Node.js)

```bash
npm run build
npm run start
```

### 🐳 Production (Docker) — Recommended for VPS

The easiest way to self-host on any VPS (DigitalOcean, Hetzner, Contabo, etc.):

```bash
# 1. Clone
git clone https://github.com/qijinhaocode/indie-os.git
cd indie-os

# 2. Build and start (database persists in ./data/)
docker compose up -d

# 3. Open http://your-server-ip:3000
```

**To update:**
```bash
git pull
docker compose up -d --build
```

The SQLite database is stored in `./data/indie-os.db` on your host — just back up that directory.

> **Note:** indie-os is designed for **single-user, self-hosted** deployment. Not compatible with serverless platforms like Vercel (no persistent filesystem).

---

## 🔌 Integrations

All API keys are stored locally in your SQLite database. Go to **Settings** to configure them.

### GitHub
1. Create a token at [github.com/settings/tokens](https://github.com/settings/tokens) with `repo` and `workflow` scopes
2. Add it in Settings → API Keys → GitHub Token
3. On any project page, add a GitHub integration with `owner/repo`

### Vercel
1. Create a token at [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Add it in Settings → Vercel Token
3. On any project page, add a Vercel integration using your project name

### Stripe
1. Go to [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Use a **Restricted Key** with read-only access for security
3. Add it in Settings → Stripe Secret Key
4. On any project page, add a Stripe integration — MRR is auto-logged to revenue on each sync

### HTTP Health Probe
No API key needed. On any project page, add an HTTP probe:
- Enter any URL (your API, frontend, health endpoint)
- Choose GET or HEAD
- Set expected status code (default: 200)
- Sync manually or let the cron handle it

### Auto-sync (Cron)
1. Go to Settings → Auto-sync
2. Copy the Cron URL
3. Register it on [cron-job.org](https://cron-job.org) (free tier is plenty)
4. Set interval to every 30 minutes or 1 hour

### Down Alerts (Slack / Discord / Telegram)

**Slack / Discord:** Create an Incoming Webhook and paste the URL in Settings → Down Alerts → Webhook URL.

**Telegram:**
1. Message [@BotFather](https://t.me/BotFather) → `/newbot` → get your token
2. Start a chat with your bot (or add to a group)
3. Get your Chat ID via `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Add both in Settings → Down Alerts

### AI Copilot
1. Get an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Add it in Settings → OpenAI API Key
3. Click "Generate Insights" on the dashboard home

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Database | [SQLite](https://sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) components |
| i18n | [next-intl](https://next-intl-docs.vercel.app/) (zh/en, cookie-based) |
| Charts | [Recharts](https://recharts.org/) |
| Dark mode | [next-themes](https://github.com/pacocoursey/next-themes) |
| AI | [OpenAI SDK](https://github.com/openai/openai-node) (gpt-4o-mini) |
| Payments | [Stripe SDK](https://github.com/stripe/stripe-node) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/           # REST API routes
│   ├── projects/      # Project list + detail pages
│   ├── revenue/       # Revenue tracking
│   ├── time/          # Time logging
│   ├── services/      # Integrations overview
│   ├── settings/      # API keys, cron, notifications
│   ├── share/[token]/ # Public project share pages
│   └── status/[token]/ # Public status page
├── components/
│   └── dashboard/     # Feature components (charts, integrations)
├── db/
│   ├── schema.ts      # Drizzle schema
│   └── index.ts       # DB connection + auto-migrations
├── lib/
│   ├── utils.ts       # Formatting helpers
│   └── notify.ts      # Down alert sender
└── actions/
    └── locale.ts      # Language switching
messages/
├── zh.json            # Chinese translations
└── en.json            # English translations
```

---

## 🗺 Roadmap

### ✅ Phase 1: Visibility (Done)
- [x] Project registry with status, repo, domain, tech stack
- [x] Manual revenue logging (MRR, one-time, refunds)
- [x] Time tracking with ROI calculation
- [x] Dark mode + mobile responsive
- [x] Chinese / English i18n

### ✅ Phase 2: Automation (Done)
- [x] GitHub integration (CI status, commits, stars)
- [x] Vercel integration (deployment status)
- [x] HTTP health probes (any URL, response time)
- [x] Stripe integration (MRR auto-sync → revenue)
- [x] Cron auto-sync endpoint
- [x] Down alerts (Slack, Discord, Telegram)
- [x] Data export (CSV, JSON backup)

### ✅ Phase 3: AI + Sharing (Done)
- [x] AI Copilot (GPT-4o-mini portfolio analysis)
- [x] Public project share pages
- [x] Public status page
- [x] Revenue + time charts

### ✅ Phase 4: Ops & Delivery (Done)
- [x] Docker Compose deployment (one-command VPS deploy)
- [x] Weekly email digest (Resend)
- [x] `DATABASE_URL` environment variable support

### 🔜 Phase 5: Ecosystem
- [ ] RevenueCat integration (App Store / Play Store MRR)
- [ ] Paddle integration
- [ ] Plugin system for custom integrations
- [ ] Multi-user support with auth

---

## 🤝 Contributing

indie-os is built for indie hackers, by an indie hacker. Contributions are welcome.

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit with conventional commits: `feat: add xyz`
4. Open a PR

**Ideas for contributions:**
- New integrations (RevenueCat, Paddle, Cloudflare, Railway, Fly.io...)
- Improved AI prompts
- Additional chart types
- Email notifications

---

## 🔒 Privacy & Security

- **All data stays on your machine** (or your own server)
- **No telemetry, no tracking**
- **Bring Your Own Keys** — API keys stored in local SQLite, never sent to any third party
- The cron endpoint and status page use token-based auth; rotate via Settings if needed

---

## License

MIT © [qijinhaocode](https://github.com/qijinhaocode)

---

<div align="center">
  <p>Built with ⚡ by an indie hacker, for indie hackers.</p>
  <p>If this saves you time, consider giving it a ⭐</p>
</div>
