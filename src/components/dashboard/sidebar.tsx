import { NavContent } from "./nav-content";

export function Sidebar() {
  return (
    <aside className="hidden md:flex h-full w-56 flex-col border-r border-border bg-card shrink-0">
      <NavContent />
    </aside>
  );
}
