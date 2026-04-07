import { db } from "@/db";
import { projects } from "@/db/schema";
import { CommandPalette } from "./command-palette";

export async function CommandPaletteWrapper() {
  const allProjects = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(projects.name);

  return <CommandPalette projects={allProjects} />;
}
