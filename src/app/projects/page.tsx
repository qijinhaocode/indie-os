import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, GitBranch, Globe, Layers } from "lucide-react";
import { AddProjectDialog } from "./add-project-dialog";
import { getTranslations } from "next-intl/server";

const statusVariant = {
  active: "success" as const,
  paused: "warning" as const,
  archived: "secondary" as const,
  idea: "outline" as const,
};

export default async function ProjectsPage() {
  const t = await getTranslations("projects");
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>
        <AddProjectDialog>
          <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            {t("addProject")}
          </button>
        </AddProjectDialog>
      </div>

      {allProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">{t("noProjects")}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{t("noProjectsDesc")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                  {project.name}
                </h3>
                <Badge variant={statusVariant[project.status]} className="shrink-0">
                  {t(`status.${project.status}`)}
                </Badge>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {project.description}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {project.repo && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <GitBranch className="h-3 w-3" />
                    Repo
                  </span>
                )}
                {project.domain && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    {project.domain}
                  </span>
                )}
                {project.techStack && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Layers className="h-3 w-3" />
                    {project.techStack}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
