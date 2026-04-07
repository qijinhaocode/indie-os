import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, revenueEntries, timeLogs, integrations, appSettings } from "@/db/schema";
import { desc, eq, gte } from "drizzle-orm";
import OpenAI from "openai";

export async function POST() {
  try {
    const keyRow = await db.query.appSettings.findFirst({
      where: eq(appSettings.key, "openai_api_key"),
    });
    if (!keyRow?.value) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add it in Settings." },
        { status: 400 }
      );
    }

    // Gather data snapshot (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const [allProjects, recentRevenue, recentTime, allIntegrations] = await Promise.all([
      db.select().from(projects),
      db.select().from(revenueEntries).where(gte(revenueEntries.recordedAt, thirtyDaysAgo)).orderBy(desc(revenueEntries.recordedAt)),
      db.select().from(timeLogs).where(gte(timeLogs.loggedAt, thirtyDaysAgo)).orderBy(desc(timeLogs.loggedAt)),
      db.select().from(integrations),
    ]);

    const mrr30 = recentRevenue
      .filter((r) => r.type === "mrr")
      .reduce((sum, r) => sum + r.amount, 0);

    const totalRevenue30 = recentRevenue.reduce((sum, r) => sum + r.amount, 0);
    const totalMinutes30 = recentTime.reduce((sum, t) => sum + t.minutes, 0);

    const projectSummaries = allProjects.map((p) => {
      const revenue = recentRevenue.filter((r) => r.projectId === p.id).reduce((s, r) => s + r.amount, 0);
      const minutes = recentTime.filter((t) => t.projectId === p.id).reduce((s, t) => s + t.minutes, 0);
      const roi = minutes > 0 ? ((revenue / (minutes / 60)) * 100) / 100 : null;
      const httpIntegrations = allIntegrations.filter(
        (i) => i.projectId === p.id && i.type === "http" && i.cachedData
      );
      const hasDownService = httpIntegrations.some(
        (i) => JSON.parse(i.cachedData!).status !== "up"
      );

      return {
        name: p.name,
        status: p.status,
        revenue30d: revenue,
        hours30d: +(totalMinutes30 / 60).toFixed(1),
        roiPerHour: roi,
        hasDownService,
      };
    });

    const dataContext = `
# Indie OS Dashboard Data Snapshot (last 30 days)

## Portfolio Overview
- Total projects: ${allProjects.length} (${allProjects.filter((p) => p.status === "active").length} active)
- Total revenue (30d): $${totalRevenue30.toFixed(2)}
- MRR (from subscriptions): $${mrr30.toFixed(2)}
- Total dev hours (30d): ${(totalMinutes30 / 60).toFixed(1)}h

## Projects
${projectSummaries.map((p) => `
### ${p.name} [${p.status}]
- 30d revenue: $${p.revenue30d.toFixed(2)}
- 30d hours: ${p.hours30d}h
- ROI: ${p.roiPerHour ? `$${p.roiPerHour.toFixed(2)}/hr` : "no data"}
- Service status: ${p.hasDownService ? "⚠️ has degraded/down service" : "✅ all up"}
`).join("")}
`.trim();

    const openai = new OpenAI({ apiKey: keyRow.value });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a pragmatic business advisor for indie hackers and solo developers. 
Analyze the dashboard data and give 3-5 concise, actionable insights. 
Focus on: revenue opportunities, time allocation, risk signals, and next priorities.
Be direct and specific. Use numbers from the data. Avoid generic advice.
Respond in the same language the data appears to be targeting (if project names are in Chinese, respond in Chinese).
Format as JSON: { "insights": [{ "type": "opportunity"|"risk"|"achievement"|"tip", "title": "...", "body": "..." }] }`,
        },
        { role: "user", content: dataContext },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 800,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(content) as { insights: unknown[] };

    return NextResponse.json({
      insights: result.insights ?? [],
      generatedAt: new Date().toISOString(),
      dataSnapshot: {
        projects: allProjects.length,
        mrr30: mrr30,
        hours30: +(totalMinutes30 / 60).toFixed(1),
      },
    });
  } catch (err) {
    console.error("[ai/insights]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate insights" },
      { status: 500 }
    );
  }
}
