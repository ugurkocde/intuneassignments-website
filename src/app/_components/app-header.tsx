"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ClipboardCheck, GitGraph } from "lucide-react";
import { cn } from "~/lib/utils";
import { SpotlightSearch } from "~/components/spotlight-search";
import { SignOutButton } from "~/app/_components/sign-out-button";

type AppHeaderProps = {
  /**
   * Optional back link (useful on detail pages). Shown on mobile to avoid crowding.
   */
  backHref?: string;
  backLabel?: string;
};

export function AppHeader({ backHref, backLabel = "Back" }: AppHeaderProps) {
  const pathname = usePathname();

  const isDashboard = pathname === "/dashboard";
  const isGraph = pathname === "/interactive-graph";

  const pillLink = (href: string, active: boolean, label: React.ReactNode) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm ring-1 ring-border"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-8">
        {/* Top row (always compact, no wrapping) */}
        <div className="flex h-14 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {backHref ? (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:text-foreground sm:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
            ) : null}

            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold text-lg tracking-tight"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline-block">
                Intune Assignment Checker
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              aria-current={isDashboard ? "page" : undefined}
              className={cn(
                "transition-colors hover:text-foreground/80",
                isDashboard ? "text-foreground" : "text-foreground/60",
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/interactive-graph"
              aria-current={isGraph ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 transition-colors hover:text-foreground/80",
                isGraph ? "text-foreground" : "text-foreground/60",
              )}
            >
              <GitGraph className="h-4 w-4" />
              <span>Graph</span>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <SpotlightSearch className="mr-0" compactTrigger />
            {/* Mobile: icon-only to avoid huge button. Desktop: full label */}
            <SignOutButton className="hidden sm:inline-flex" />
            <SignOutButton iconOnly className="inline-flex sm:hidden" />
          </div>
        </div>

        {/* Mobile nav pills (prevents wrap + improves tap targets) */}
        <div className="sm:hidden pb-3">
          <div className="grid w-full grid-cols-2 items-center gap-1 rounded-lg bg-muted p-1">
            {pillLink("/dashboard", isDashboard, "Dashboard")}
            {pillLink(
              "/interactive-graph",
              isGraph,
              <>
                <GitGraph className="h-4 w-4" />
                <span>Graph</span>
              </>,
            )}
          </div>
        </div>
      </div>
    </header>
  );
}


