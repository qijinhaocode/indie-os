"use client";

import { useTranslations, useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  DollarSign,
  Clock,
  Settings,
  Zap,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { setLocale } from "@/actions/locale";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavContentProps {
  onLinkClick?: () => void;
}

export function NavContent({ onLinkClick }: NavContentProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const navItems = [
    { href: "/", label: t("overview"), icon: LayoutDashboard, exact: true },
    { href: "/projects", label: t("projects"), icon: FolderKanban },
    { href: "/services", label: t("services"), icon: Activity },
    { href: "/revenue", label: t("revenue"), icon: DollarSign },
    { href: "/time", label: t("time"), icon: Clock },
  ];

  function switchLocale() {
    const nextLocale = locale === "zh" ? "en" : "zh";
    startTransition(() => {
      setLocale(nextLocale);
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-4 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">indie-os</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === "/"
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-2 py-3 space-y-0.5 shrink-0">
        <div className="flex items-center gap-1 px-1">
          <button
            onClick={switchLocale}
            disabled={isPending}
            className="flex flex-1 items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
          >
            <Languages className="h-4 w-4 shrink-0" />
            {isPending ? "..." : locale === "zh" ? "English" : "中文"}
          </button>
          <ThemeToggle className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shrink-0" />
        </div>
        <Link
          href="/settings"
          onClick={onLinkClick}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          {t("settings")}
        </Link>
      </div>
    </div>
  );
}
