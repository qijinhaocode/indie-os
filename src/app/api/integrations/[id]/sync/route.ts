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
