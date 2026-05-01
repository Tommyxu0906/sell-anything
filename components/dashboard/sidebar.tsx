"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Inbox,
  ListChecks,
  Settings,
  Home,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RE_NAV = [
  { href: "/contacts?line=real_estate", label: "Contacts", icon: Users, match: "/contacts" },
  { href: "/inbox?line=real_estate", label: "Inbox", icon: Inbox, match: "/inbox" },
  { href: "/sequences?line=real_estate", label: "Sequences", icon: ListChecks, match: "/sequences" },
];

const INS_NAV = [
  { href: "/contacts?line=life_insurance", label: "Contacts", icon: Users, match: "/contacts" },
  { href: "/inbox?line=life_insurance", label: "Inbox", icon: Inbox, match: "/inbox" },
  { href: "/sequences?line=life_insurance", label: "Sequences", icon: ListChecks, match: "/sequences" },
];

function NavItem({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const line = searchParams.get("line");

  const isActive = (navHref: string, matchPath: string, navLine: string) => {
    return pathname.startsWith(matchPath) && line === navLine;
  };

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-background">
      {/* Identity */}
      <div className="border-b px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold mb-3">
          K
        </div>
        <p className="font-semibold text-sm leading-tight">Kanghuan Xu</p>
        <p className="text-xs text-muted-foreground mt-0.5">Greater Boston</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {/* Overview */}
        <div>
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            Dashboard
          </Link>
        </div>

        {/* Real Estate */}
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-1.5">
            <Home className="h-3 w-3 text-orange-500" />
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Real Estate</p>
          </div>
          <p className="px-3 text-[10px] text-muted-foreground mb-2">Prophet Homes</p>
          <div className="space-y-0.5">
            {RE_NAV.map(({ href, label, icon, match }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isActive(href, match, "real_estate")}
              />
            ))}
          </div>
        </div>

        {/* Life Insurance */}
        <div>
          <div className="flex items-center gap-1.5 px-3 mb-1.5">
            <Shield className="h-3 w-3 text-blue-500" />
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Life Insurance</p>
          </div>
          <p className="px-3 text-[10px] text-muted-foreground mb-2">National Life Group</p>
          <div className="space-y-0.5">
            {INS_NAV.map(({ href, label, icon, match }) => (
              <NavItem
                key={href}
                href={href}
                label={label}
                icon={icon}
                active={isActive(href, match, "life_insurance")}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Settings */}
      <div className="border-t p-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
