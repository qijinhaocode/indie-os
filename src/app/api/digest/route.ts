import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, revenueEntries, timeLogs, integrations, appSettings } from "@/db/schema";
import { eq, sql, desc, gte } from "drizzle-orm";
import { Resend } from "resend";

function formatCurrency(amount: number, currency = "USD"): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  });
}

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildHtml(data: {
  weekLabel: string;
  totalRevenue: number;
  totalMinutes: number;
  activeProjects: number;
  totalProjects: number;
  upServices: number;
  downServices: number;
  topProjects: { name: string; revenue: number; minutes: number }[];
  recentRevenue: { projectName: string | null; amount: number; currency: string; type: string; recordedAt: string }[];
}): string {
  const statusBar = data.downServices > 0
    ? `<tr><td style="background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:12px 16px;color:#DC2626;font-size:13px;">
        ⚠️ ${data.downServices} service(s) currently down or degraded
       </td></tr>`
    : data.upServices > 0
    ? `<tr><td style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:12px 16px;color:#16A34A;font-size:13px;">
        ✅ All ${data.upServices} monitored service(s) operational
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8F8F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F8;padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">

        <!-- Header -->
        <tr><td style="background:#4F46E5;padding:24px 32px;">
          <table width="100%"><tr>
            <td style="color:#FFFFFF;font-size:20px;font-weight:700;">⚡ indie-os</td>
            <td style="color:#C7D2FE;font-size:13px;text-align:right;">Weekly Digest</td>
          </tr></table>
          <p style="color:#A5B4FC;font-size:13px;margin:8px 0 0;">${data.weekLabel}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <table width="100%" cellspacing="0" cellpadding="0" style="border-spacing:0 12px;">

            ${statusBar}

            <!-- Stats row -->
            <tr>
              <td>
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="32%" style="background:#F5F3FF;border-radius:8px;padding:16px;text-align:center;">
                      <div style="font-size:22px;font-weight:700;color:#4F46E5;">${formatCurrency(data.totalRevenue)}</div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Revenue</div>
                    </td>
                    <td width="4%"></td>
                    <td width="32%" style="background:#F5F3FF;border-radius:8px;padding:16px;text-align:center;">
                      <div style="font-size:22px;font-weight:700;color:#4F46E5;">${formatHours(data.totalMinutes)}</div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Dev Time</div>
                    </td>
                    <td width="4%"></td>
                    <td width="32%" style="background:#F5F3FF;border-radius:8px;padding:16px;text-align:center;">
                      <div style="font-size:22px;font-weight:700;color:#4F46E5;">${data.activeProjects}<span style="font-size:14px;color:#6B7280;">/${data.totalProjects}</span></div>
                      <div style="font-size:11px;color:#6B7280;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Active</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Top projects -->
            ${data.topProjects.length > 0 ? `
            <tr><td style="padding-top:8px;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 10px;">Top Projects (30 days)</p>
              ${data.topProjects.map((p) => `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td style="font-size:13px;color:#111827;font-weight:500;">${p.name}</td>
                  <td style="text-align:right;font-size:12px;color:#6B7280;">${formatCurrency(p.revenue)} · ${formatHours(p.minutes)}</td>
                </tr>
              </table>`).join("")}
            </td></tr>` : ""}

            <!-- Recent revenue -->
            ${data.recentRevenue.length > 0 ? `
            <tr><td style="padding-top:4px;">
              <p style="font-size:13px;font-weight:600;color:#374151;margin:0 0 10px;">Recent Revenue</p>
              ${data.recentRevenue.map((r) => `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6px;">
                <tr>
                  <td style="font-size:12px;color:#374151;">${r.projectName ?? "—"} <span style="color:#9CA3AF;">(${r.type})</span></td>
                  <td style="text-align:right;font-size:12px;font-weight:500;color:${r.type === "refund" ? "#DC2626" : "#059669"};">
                    ${r.type === "refund" ? "-" : "+"}${formatCurrency(r.amount, r.currency)}
                  </td>
                </tr>
              </table>`).join("")}
            </td></tr>` : ""}

          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 32px;text-align:center;">
          <p style="font-size:11px;color:#9CA3AF;margin:0;">
            Sent by <a href="https://github.com/qijinhaocode/indie-os" style="color:#4F46E5;text-decoration:none;">indie-os</a> · Your self-hosted indie hacker dashboard
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST() {
  try {
    const [apiKeyRow, emailRow] = await Promise.all([
      db.query.appSettings.findFirst({ where: eq(appSettings.key, "resend_api_key") }),
      db.query.appSettings.findFirst({ where: eq(appSettings.key, "digest_email") }),
    ]);

    if (!apiKeyRow?.value) {
      return NextResponse.json({ error: "Resend API key not configured" }, { status: 400 });
    }
    if (!emailRow?.value) {
      return NextResponse.json({ error: "Digest email not configured" }, { status: 400 });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];

    const [allProjects, revenueRows, timeRows, httpProbes, recentRevenueRows] = await Promise.all([
      db.select().from(projects),
      db.select({ total: sql<number>`coalesce(sum(${revenueEntries.amount}),0)` })
        .from(revenueEntries).where(gte(revenueEntries.recordedAt, thirtyDaysAgo)),
      db.select({ total: sql<number>`coalesce(sum(${timeLogs.minutes}),0)` })
        .from(timeLogs).where(gte(timeLogs.loggedAt, thirtyDaysAgo)),
      db.select({ id: integrations.id, cachedData: integrations.cachedData })
        .from(integrations).where(eq(integrations.type, "http")),
      db.select({
        projectName: projects.name,
        amount: revenueEntries.amount,
        currency: revenueEntries.currency,
        type: revenueEntries.type,
        recordedAt: revenueEntries.recordedAt,
      })
        .from(revenueEntries)
        .leftJoin(projects, eq(revenueEntries.projectId, projects.id))
        .where(gte(revenueEntries.recordedAt, thirtyDaysAgo))
        .orderBy(desc(revenueEntries.recordedAt))
        .limit(5),
    ]);

    // Project-level breakdown
    const projectRevenue = await db
      .select({
        projectId: revenueEntries.projectId,
        total: sql<number>`coalesce(sum(${revenueEntries.amount}),0)`,
      })
      .from(revenueEntries)
      .where(gte(revenueEntries.recordedAt, thirtyDaysAgo))
      .groupBy(revenueEntries.projectId);

    const projectTime = await db
      .select({
        projectId: timeLogs.projectId,
        total: sql<number>`coalesce(sum(${timeLogs.minutes}),0)`,
      })
      .from(timeLogs)
      .where(gte(timeLogs.loggedAt, thirtyDaysAgo))
      .groupBy(timeLogs.projectId);

    const topProjects = allProjects
      .map((p) => ({
        name: p.name,
        revenue: projectRevenue.find((r) => r.projectId === p.id)?.total ?? 0,
        minutes: projectTime.find((t) => t.projectId === p.id)?.total ?? 0,
      }))
      .filter((p) => p.revenue > 0 || p.minutes > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const upServices = httpProbes.filter(
      (p) => p.cachedData && (JSON.parse(p.cachedData) as { status: string }).status === "up"
    ).length;
    const downServices = httpProbes.filter(
      (p) => !p.cachedData || (JSON.parse(p.cachedData) as { status: string }).status !== "up"
    ).length - (httpProbes.filter((p) => !p.cachedData).length);

    const now = new Date();
    const weekLabel = `Week of ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

    const html = buildHtml({
      weekLabel,
      totalRevenue: revenueRows[0]?.total ?? 0,
      totalMinutes: timeRows[0]?.total ?? 0,
      activeProjects: allProjects.filter((p) => p.status === "active").length,
      totalProjects: allProjects.length,
      upServices,
      downServices: Math.max(0, downServices),
      topProjects,
      recentRevenue: recentRevenueRows,
    });

    const resend = new Resend(apiKeyRow.value);
    const { error } = await resend.emails.send({
      from: "indie-os <digest@resend.dev>",
      to: emailRow.value,
      subject: `⚡ indie-os Digest — ${weekLabel}`,
      html,
    });

    if (error) {
      console.error("[digest] resend error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sentTo: emailRow.value });
  } catch (err) {
    console.error("[digest]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send digest" },
      { status: 500 }
    );
  }
}
