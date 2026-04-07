import { db } from "@/db";
import { appSettings, milestones, projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";

function groupByMonth(items: { occurredAt: string }[]) {
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.occurredAt.slice(0, 7); // "YYYY-MM"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
}

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const tokenRow = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "changelog_token"),
  });
  if (!tokenRow?.value || tokenRow.value !== token) notFound();

  const allMilestones = await db
    .select()
    .from(milestones)
    .orderBy(desc(milestones.occurredAt));

  const allProjects = await db.select().from(projects);
  const projectNames = Object.fromEntries(allProjects.map((p) => [p.id, p.name]));

  const groups = groupByMonth(allMilestones);
  const sortedMonths = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">i</span>
            </div>
            <span className="font-semibold text-lg">Changelog</span>
          </div>
          <h1 className="text-3xl font-bold">What&rsquo;s New</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Product updates, launches, and milestones.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {allMilestones.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            No milestones yet.
          </p>
        ) : (
          <div className="space-y-12">
            {sortedMonths.map((month) => {
              const items = groups.get(month) ?? [];
              return (
                <section key={month}>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-5">
                    {formatMonth(month)}
                  </h2>
                  <div className="relative pl-5 space-y-8 border-l border-border">
                    {items.map((m) => (
                      <div key={m.id} className="relative">
                        {/* dot */}
                        <div className="absolute -left-[21px] top-0.5 h-4 w-4 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          <span className="text-[10px]">{m.icon}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="font-semibold">{m.title}</p>
                            {projectNames[m.projectId] && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {projectNames[m.projectId]}
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-sm text-muted-foreground">{m.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground">{m.occurredAt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <footer className="border-t border-border mt-16 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <a
              href="https://github.com/qijinhaocode/indie-os"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              indie-os
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
