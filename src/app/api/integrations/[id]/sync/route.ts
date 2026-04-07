import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { integrations, appSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    if (integration.type === "github") {
      const tokenRow = await db.query.appSettings.findFirst({
        where: eq(appSettings.key, "github_token"),
      });

      if (!tokenRow?.value) {
        return NextResponse.json(
          { error: "GitHub token not configured. Go to Settings to add it." },
          { status: 400 }
        );
      }

      const config = JSON.parse(integration.config) as { owner: string; repo: string };
      const { owner, repo } = config;

      const [repoData, commitsData, runsData] = await Promise.all([
        fetchGitHub(`/repos/${owner}/${repo}`, tokenRow.value),
        fetchGitHub(`/repos/${owner}/${repo}/commits?per_page=1`, tokenRow.value),
        fetchGitHub(`/repos/${owner}/${repo}/actions/runs?per_page=1`, tokenRow.value),
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

      const cachedData = {
        stars: repoData?.stargazers_count ?? 0,
        openIssues: repoData?.open_issues_count ?? 0,
        defaultBranch: repoData?.default_branch ?? "main",
        description: repoData?.description ?? null,
        htmlUrl: repoData?.html_url ?? null,
        latestCommit,
        latestRun,
      };

      await db
        .update(integrations)
        .set({
          cachedData: JSON.stringify(cachedData),
          lastSyncedAt: new Date().toISOString(),
        })
        .where(eq(integrations.id, parseInt(id)));

      return NextResponse.json({ success: true, data: cachedData });
    }

    return NextResponse.json({ error: "Unsupported integration type" }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
