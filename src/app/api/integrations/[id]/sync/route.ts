import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, appSettings, revenueEntries, projects, uptimeHistory } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { sendDownAlert } from "@/lib/notify";

interface LemonSqueezyData {
  mrr: number; // USD (cents already converted to dollars)
  activeSubscriptions: number;
  totalCustomers: number;
  totalRevenue: number;
  currency: string;
  syncedAt: string;
}

async function syncLemonSqueezy(
  integration: { id: number; config: string; projectId: number },
  apiKey: string
): Promise<LemonSqueezyData> {
  const config = JSON.parse(integration.config) as { storeId?: string };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/vnd.api+json",
  };

  // Fetch active subscriptions
  const subUrl = config.storeId
    ? `https://api.lemonsqueezy.com/v1/subscriptions?filter[store_id]=${config.storeId}&filter[status]=active&page[size]=100`
    : `https://api.lemonsqueezy.com/v1/subscriptions?filter[status]=active&page[size]=100`;

  const subRes = await fetch(subUrl, { headers, next: { revalidate: 0 } });
  if (!subRes.ok) {
    const text = await subRes.text();
    throw new Error(`Lemon Squeezy API error ${subRes.status}: ${text}`);
  }
  const subJson = (await subRes.json()) as {
    data: Array<{
      attributes: {
        status: string;
        mrr: number; // in cents
        currency: string;
      };
    }>;
    meta?: { page?: { total?: number } };
  };

  const activeSubs = subJson.data ?? [];
  const totalMrrCents = activeSubs.reduce((s, sub) => s + (sub.attributes.mrr ?? 0), 0);
  const currency = activeSubs[0]?.attributes.currency ?? "USD";

  // Fetch orders for total revenue
  const ordersUrl = config.storeId
    ? `https://api.lemonsqueezy.com/v1/orders?filter[store_id]=${config.storeId}&page[size]=1`
    : `https://api.lemonsqueezy.com/v1/orders?page[size]=1`;

  let totalRevenueCents = 0;
  let totalCustomers = 0;
  try {
    const ordersRes = await fetch(ordersUrl, { headers, next: { revalidate: 0 } });
    if (ordersRes.ok) {
      const ordersJson = (await ordersRes.json()) as {
        meta?: { page?: { total?: number } };
      };
      totalCustomers = ordersJson.meta?.page?.total ?? 0;
    }
  } catch {
    // non-critical
  }

  return {
    mrr: totalMrrCents / 100,
    activeSubscriptions: activeSubs.length,
    totalCustomers,
    totalRevenue: totalRevenueCents / 100,
    currency,
    syncedAt: new Date().toISOString(),
  };
}

interface RevenueCatData {
  mrr: number; // USD
  activeSubscriptions: number;
  activeTrials: number;
  totalRevenue: number;
  currency: string;
  syncedAt: string;
}

async function syncRevenueCat(
  integration: { id: number; config: string; projectId: number },
  secretKey: string
): Promise<RevenueCatData> {
  const config = JSON.parse(integration.config) as { projectId: string };

  const res = await fetch(
    `https://api.revenuecat.com/v2/projects/${config.projectId}/metrics/overview`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RevenueCat API error ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    items?: Array<{ id: string; value: number }>;
  };

  const items = json.items ?? [];
  const find = (id: string) =>
    items.find((i) => i.id === id)?.value ?? 0;

  const mrr = find("mrr");
  const activeSubscriptions = find("active_subscriptions");
  const activeTrials = find("active_trials");
  const totalRevenue = find("revenue");

  return {
    mrr,
    activeSubscriptions,
    activeTrials,
    totalRevenue,
    currency: "USD",
    syncedAt: new Date().toISOString(),
  };
}

interface StripeData {
  mrr: number; // in cents
  currency: string;
  activeSubscriptions: number;
  totalCustomers: number;
  last30DaysRevenue: number; // in cents
  syncedAt: string;
}

async function syncStripe(
  integration: { id: number; config: string; projectId: number },
  secretKey: string
): Promise<StripeData> {
  const stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });

  const [subscriptions, charges] = await Promise.all([
    stripe.subscriptions.list({ status: "active", limit: 100 }),
    stripe.charges.list({
      limit: 100,
      created: { gte: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 },
    }),
  ]);

  // MRR: sum of active subscription amounts normalised to monthly
  let mrr = 0;
  for (const sub of subscriptions.data) {
    for (const item of sub.items.data) {
      const price = item.price;
      const unitAmount = price.unit_amount ?? 0;
      const qty = item.quantity ?? 1;
      if (price.recurring?.interval === "month") {
        mrr += unitAmount * qty;
      } else if (price.recurring?.interval === "year") {
        mrr += Math.round((unitAmount * qty) / 12);
      }
    }
  }

  const last30DaysRevenue = charges.data
    .filter((c) => c.paid && !c.refunded)
    .reduce((sum, c) => sum + c.amount, 0);

  const customers = await stripe.customers.list({ limit: 1 });

  const currency = subscriptions.data[0]?.currency ?? charges.data[0]?.currency ?? "usd";

  return {
    mrr,
    currency,
    activeSubscriptions: subscriptions.data.length,
    totalCustomers: customers.data.length > 0 ? (customers as { total_count?: number }).total_count ?? 0 : 0,
    last30DaysRevenue,
    syncedAt: new Date().toISOString(),
  };
}

async function fetchGitHub(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchVercel(path: string, token: string, teamId?: string) {
  const url = new URL(`https://api.vercel.com${path}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return res.json();
}

async function syncGitHub(integration: { id: number; config: string }, token: string) {
  const config = JSON.parse(integration.config) as { owner: string; repo: string };
  const { owner, repo } = config;

  const [repoData, commitsData, runsData] = await Promise.all([
    fetchGitHub(`/repos/${owner}/${repo}`, token),
    fetchGitHub(`/repos/${owner}/${repo}/commits?per_page=1`, token),
    fetchGitHub(`/repos/${owner}/${repo}/actions/runs?per_page=1`, token),
  ]);

  const latestCommit = Array.isArray(commitsData) && commitsData[0]
    ? {
        sha: commitsData[0].sha.slice(0, 7),
        message: commitsData[0].commit.message.split("\n")[0],
        author: commitsData[0].commit.author.name,
        date: commitsData[0].commit.author.date,
        url: commitsData[0].html_url,
      }
    : null;

  const latestRun = runsData?.workflow_runs?.[0]
    ? {
        status: runsData.workflow_runs[0].status,
        conclusion: runsData.workflow_runs[0].conclusion,
        name: runsData.workflow_runs[0].name,
        url: runsData.workflow_runs[0].html_url,
        updatedAt: runsData.workflow_runs[0].updated_at,
      }
    : null;

  return {
    stars: repoData?.stargazers_count ?? 0,
    openIssues: repoData?.open_issues_count ?? 0,
    defaultBranch: repoData?.default_branch ?? "main",
    description: repoData?.description ?? null,
    htmlUrl: repoData?.html_url ?? null,
    latestCommit,
    latestRun,
  };
}

async function syncHttp(integration: { id: number; config: string }) {
  const config = JSON.parse(integration.config) as {
    url: string;
    method?: string;
    expectedStatus?: number;
  };
  const { url, method = "GET", expectedStatus = 200 } = config;

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      next: { revalidate: 0 },
    });
    clearTimeout(timeout);
    const responseTimeMs = Date.now() - start;
    const isUp = res.status === expectedStatus;
    return {
      status: isUp ? "up" : "degraded",
      statusCode: res.status,
      responseTimeMs,
      error: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      status: "down",
      statusCode: null,
      responseTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Request failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function syncVercel(integration: { id: number; config: string }, token: string) {
  const config = JSON.parse(integration.config) as { projectName: string; teamId?: string };
  const { projectName, teamId } = config;

  const [projectData, deploymentsData] = await Promise.all([
    fetchVercel(`/v9/projects/${projectName}`, token, teamId),
    fetchVercel(
      `/v6/deployments?projectId=${projectName}&limit=5`,
      token,
      teamId
    ),
  ]);

  const latestDeployment = deploymentsData?.deployments?.[0]
    ? {
        uid: deploymentsData.deployments[0].uid,
        url: `https://${deploymentsData.deployments[0].url}`,
        state: deploymentsData.deployments[0].state as string,
        createdAt: deploymentsData.deployments[0].createdAt,
        meta: deploymentsData.deployments[0].meta,
      }
    : null;

  return {
    name: projectData?.name ?? projectName,
    framework: projectData?.framework ?? null,
    link: projectData?.link ?? null,
    latestDeployment,
    productionUrl: projectData?.alias?.[0]?.domain
      ? `https://${projectData.alias[0].domain}`
      : null,
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, parseInt(id)),
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    let cachedData: object;

    if (integration.type === "github") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "github_token"),
      });
      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "GitHub token not configured. Go to Settings." },
          { status: 400 }
        );
      }
      cachedData = await syncGitHub(integration, tokenRow.value);
    } else if (integration.type === "http") {
      // Capture previous status to detect transitions
      const prevStatus = integration.cachedData
        ? (JSON.parse(integration.cachedData) as { status: string }).status
        : null;

      cachedData = await syncHttp(integration);
      const httpResult = cachedData as { status: string; statusCode: number | null; error: string | null };

      // Write uptime history record
      await db.insert(uptimeHistory).values({
        integrationId: parseInt(id),
        status: httpResult.status as "up" | "degraded" | "down",
        statusCode: httpResult.statusCode,
        responseTimeMs: (cachedData as { responseTimeMs: number }).responseTimeMs,
        checkedAt: new Date().toISOString(),
      });

      // Prune old records — keep last 90 per integration
      const oldest = await db
        .select({ id: uptimeHistory.id })
        .from(uptimeHistory)
        .where(eq(uptimeHistory.integrationId, parseInt(id)))
        .orderBy(sql`${uptimeHistory.checkedAt} desc`)
        .offset(90)
        .limit(1);
      if (oldest.length > 0) {
        await db
          .delete(uptimeHistory)
          .where(
            sql`${uptimeHistory.integrationId} = ${parseInt(id)} AND ${uptimeHistory.id} <= ${oldest[0].id}`
          );
      }

      // Notify only when transitioning into "down" or "degraded"
      if (
        httpResult.status !== "up" &&
        prevStatus !== httpResult.status
      ) {
        const config = JSON.parse(integration.config) as { url: string; label?: string };
        const project = await db.query.projects.findFirst({ where: eq(projects.id, integration.projectId) });
        sendDownAlert({
          projectName: project?.name ?? `Project #${integration.projectId}`,
          integrationLabel: config.label ?? config.url,
          url: config.url,
          status: httpResult.status,
          statusCode: httpResult.statusCode,
          error: httpResult.error,
        }).catch((e) => console.error("[notify]", e));
      }
    } else if (integration.type === "vercel") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "vercel_token"),
      });
      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "Vercel token not configured. Go to Settings." },
          { status: 400 }
        );
      }
      cachedData = await syncVercel(integration, tokenRow.value);
    } else if (integration.type === "stripe") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "stripe_secret_key"),
      });
      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "Stripe secret key not configured. Go to Settings." },
          { status: 400 }
        );
      }
      cachedData = await syncStripe(integration, tokenRow.value);

      // auto-write MRR to revenue_entries if changed
      const stripeData = cachedData as StripeData;
      if (stripeData.mrr > 0) {
        const today = new Date().toISOString().split("T")[0];
        const existing = await db.query.revenueEntries.findFirst({
          where: (r, { and, eq: eqF }) =>
            and(
              eqF(r.projectId, integration.projectId),
              eqF(r.source, "stripe-auto"),
              eqF(r.recordedAt, today)
            ),
        });
        if (!existing) {
          await db.insert(revenueEntries).values({
            projectId: integration.projectId,
            amount: stripeData.mrr / 100,
            currency: stripeData.currency.toUpperCase(),
            type: "mrr",
            source: "stripe-auto",
            recordedAt: today,
          });
        }
      }
    } else if (integration.type === "lemonsqueezy") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "lemonsqueezy_api_key"),
      });
      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "Lemon Squeezy API key not configured. Go to Settings." },
          { status: 400 }
        );
      }
      cachedData = await syncLemonSqueezy(integration, tokenRow.value);

      // Auto-write MRR to revenue_entries if changed
      const lsData = cachedData as LemonSqueezyData;
      if (lsData.mrr > 0) {
        const today = new Date().toISOString().split("T")[0];
        const existing = await db.query.revenueEntries.findFirst({
          where: (r, { and, eq: eqF }) =>
            and(
              eqF(r.projectId, integration.projectId),
              eqF(r.source, "lemonsqueezy-auto"),
              eqF(r.recordedAt, today)
            ),
        });
        if (!existing) {
          await db.insert(revenueEntries).values({
            projectId: integration.projectId,
            amount: lsData.mrr,
            currency: lsData.currency,
            type: "mrr",
            source: "lemonsqueezy-auto",
            recordedAt: today,
          });
        }
      }
    } else if (integration.type === "revenuecat") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "revenuecat_secret_key"),
      });
      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "RevenueCat secret key not configured. Go to Settings." },
          { status: 400 }
        );
      }
      cachedData = await syncRevenueCat(integration, tokenRow.value);

      // Auto-write MRR to revenue_entries if changed
      const rcData = cachedData as RevenueCatData;
      if (rcData.mrr > 0) {
        const today = new Date().toISOString().split("T")[0];
        const existing = await db.query.revenueEntries.findFirst({
          where: (r, { and, eq: eqF }) =>
            and(
              eqF(r.projectId, integration.projectId),
              eqF(r.source, "revenuecat-auto"),
              eqF(r.recordedAt, today)
            ),
        });
        if (!existing) {
          await db.insert(revenueEntries).values({
            projectId: integration.projectId,
            amount: rcData.mrr,
            currency: rcData.currency,
            type: "mrr",
            source: "revenuecat-auto",
            recordedAt: today,
          });
        }
      }
    } else {
      return NextResponse.json({ error: "Unsupported integration type" }, { status: 400 });
    }

    await db
      .update(integrations)
      .set({
        cachedData: JSON.stringify(cachedData),
        lastSyncedAt: new Date().toISOString(),
      })
      .where(eq(integrations.id, parseInt(id)));

    return NextResponse.json({ success: true, data: cachedData });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
