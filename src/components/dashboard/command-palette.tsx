"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  DollarSign,
  Clock,
  Target,
  Settings,
  Plus,
  Globe,
  BookOpen,
  BarChart2,
  FileText,
  Flag,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

interface Project {
  id: number;
  name: string;
}

export function CommandPalette({ projects }: { projects: Project[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("cmdpalette");

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        // Don't open if focused on an input / textarea
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        )
          return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (fn: () => void) => {
      setOpen(false);
      fn();
    },
    []
  );

  const pages = [
    { href: "/", label: t("nav.overview"), icon: LayoutDashboard, shortcut: "G O" },
    { href: "/projects", label: t("nav.projects"), icon: FolderKanban, shortcut: "G P" },
    { href: "/services", label: t("nav.services"), icon: Activity, shortcut: "G S" },
    { href: "/revenue", label: t("nav.revenue"), icon: DollarSign, shortcut: "G R" },
    { href: "/time", label: t("nav.time"), icon: Clock, shortcut: "G T" },
    { href: "/goals", label: t("nav.goals"), icon: Target, shortcut: "G G" },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const actions = [
    {
      label: t("actions.logRevenue"),
      icon: DollarSign,
      href: "/revenue",
    },
    {
      label: t("actions.logTime"),
      icon: Clock,
      href: "/time",
    },
    {
      label: t("actions.newProject"),
      icon: Plus,
      href: "/projects",
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t("placeholder")} />
      <CommandList>
        <CommandEmpty>{t("empty")}</CommandEmpty>

        <CommandGroup heading={t("groups.pages")}>
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.href}
                onSelect={() => runCommand(() => router.push(page.href))}
                value={page.label}
              >
                <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                {page.label}
                {page.shortcut && (
                  <CommandShortcut>{page.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t("groups.actions")}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.label}
                onSelect={() => runCommand(() => router.push(action.href))}
                value={action.label}
              >
                <Icon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                {action.label}
              </CommandItem>
            );
          })}
        </CommandGroup>

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("groups.projects")}>
              {projects.map((p) => (
                <CommandItem
                  key={p.id}
                  onSelect={() =>
                    runCommand(() => router.push(`/projects/${p.id}`))
                  }
                  value={p.name}
                >
                  <FolderKanban className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading={t("groups.public")}>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
            value="portfolio changelog status"
          >
            <Globe className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {t("public.links")}
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() => router.push("/settings#export"))
            }
            value="export data csv json"
          >
            <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {t("public.export")}
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/goals"))}
            value="goals targets milestones"
          >
            <Flag className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {t("public.goals")}
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/revenue"))}
            value="revenue forecast mrr"
          >
            <BarChart2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {t("public.forecast")}
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
            value="ai insights copilot"
          >
            <BookOpen className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {t("public.insights")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
