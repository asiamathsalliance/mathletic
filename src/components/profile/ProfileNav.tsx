"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/profile", label: "Profile", exact: true },
  { href: "/dashboard?from=profile", label: "Progress", exact: true },
  { href: "/profile/achievements", label: "Achievements" },
  { href: "/profile/activity", label: "Activity" },
  { href: "/settings?from=profile", label: "Settings" },
] as const;

const PAGE_SUBTITLES: Record<string, string> = {
  "/profile": "Your account and progress overview",
  "/profile/achievements": "Badges and milestones you've earned",
  "/profile/activity": "Your daily problem-solving history",
};

function ProfilePageHeader() {
  const pathname = usePathname();
  const subtitle =
    PAGE_SUBTITLES[pathname] ?? "Your account and progress overview";

  return (
    <div>
      <h1 className="text-page-title">Profile</h1>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function ProfileNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        className={cn("hidden lg:flex lg:flex-col lg:gap-1 lg:w-48 lg:shrink-0", className)}
        aria-label="Profile navigation"
      >
        {TABS.map(({ href, label, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const path = href.split("?")[0];
          const active = exact ? pathname === path : pathname.startsWith(path);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile / tablet tabs */}
      <nav
        className="flex gap-1 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Profile navigation"
      >
        {TABS.map(({ href, label, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const path = href.split("?")[0];
          const active = exact ? pathname === path : pathname.startsWith(path);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <ProfilePageHeader />
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
        <ProfileNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
