"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "~/app/_components/sign-out-button";
import { ClipboardCheck, GitGraph } from "lucide-react";
import { Footer } from "~/components/footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null; 
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/40 dark:bg-gray-900/40">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-auto min-h-16 flex-wrap items-center gap-4 px-4 py-3 sm:h-16 sm:flex-nowrap sm:gap-0 sm:px-8 sm:py-0">
          <div className="mr-4 flex sm:mr-8">
            <a className="flex items-center space-x-2 font-bold text-xl tracking-tight" href="/dashboard">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline-block">Intune Assignment Checker</span>
            </a>
          </div>
          <nav className="order-3 flex w-full items-center gap-4 text-sm font-medium sm:order-none sm:w-auto sm:gap-6">
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-foreground/80 ${pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              Dashboard
            </Link>
            <Link
              href="/interactive-graph"
              className={`flex items-center gap-2 transition-colors hover:text-foreground/80 ${pathname === '/interactive-graph' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              <GitGraph className="h-4 w-4" />
              <span>Graph</span>
            </Link>
          </nav>
          <div className="flex flex-1 items-center justify-end">
            <SignOutButton />
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}
