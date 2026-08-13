"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Inbox,
  ListChecks,
  Settings,
  Sun,
  Package,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SidebarOffering {
  id: string;
  name: string;
  status: string | null;
}

const STATUS_DOT: Record<string, string> = {
  draft: "bg-muted-foreground/40",
  researching: "bg-amber-400 animate-pulse",
  ready: "bg-green-500",
  active: "bg-primary",
};

function NavLink({
  href, label, icon: Icon, active, indent,
}: { href: string; label: string; icon: React.ElementType; active: boolean; indent?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        indent && "pl-8",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </Link>
  );
}

export function Sidebar({
  orgName,
  offerings = [],
}: {
  orgName?: string;
  offerings?: SidebarOffering[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeOffering = searchParams.get("offering");
  const initial = (orgName ?? "S").charAt(0).toUpperCase();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      {/* Identity */}
      <div className="border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold mb-3">
          {initial}
        </div>
        <p className="font-semibold text-sm leading-tight truncate">{orgName ?? "sellAnything"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Sales strategy engine</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Overview */}
        <div className="space-y-0.5">
          <NavLink href="/priorities" label="Today" icon={Sun} active={pathname === "/priorities"} />
          <NavLink href="/dashboard" label="Dashboard" icon={LayoutDashboard} active={pathname === "/dashboard"} />
        </div>

        {/* Offerings */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5">
            <div className="flex items-center gap-1.5">
              <Package className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Offerings</p>
            </div>
            <Link href="/onboard" className="text-muted-foreground hover:text-foreground" title="New offering">
              <Plus className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-0.5">
            {offerings.length === 0 ? (
              <Link
                href="/onboard"
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add your first offering
              </Link>
            ) : (
              offerings.map((o) => {
                const isActive = pathname.startsWith(`/offerings/${o.id}`) || activeOffering === o.id;
                return (
                  <Link
                    key={o.id}
                    href={`/offerings/${o.id}/strategy`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[o.status ?? "draft"] ?? "bg-muted")} />
                    <span className="truncate">{o.name}</span>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Workspace */}
        <div>
          <p className="px-3 mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace</p>
          <div className="space-y-0.5">
            <NavLink href="/contacts" label="Contacts" icon={Users} active={pathname.startsWith("/contacts")} />
            <NavLink href="/inbox" label="Inbox" icon={Inbox} active={pathname.startsWith("/inbox")} />
            <NavLink href="/sequences" label="Sequences" icon={ListChecks} active={pathname.startsWith("/sequences")} />
          </div>
        </div>
      </nav>

      {/* Settings */}
      <div className="border-t p-2">
        <NavLink href="/settings" label="Settings" icon={Settings} active={pathname.startsWith("/settings")} />
      </div>
    </aside>
  );
}
