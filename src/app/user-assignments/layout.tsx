"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "~/app/_components/sign-out-button";
import { ClipboardCheck, Users, ArrowLeft } from "lucide-react";
import { Footer } from "~/components/footer";

export default function UserAssignmentsLayout({
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
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
          <div className="mr-8 flex items-center gap-4">
            <a className="flex items-center space-x-2 font-bold text-xl tracking-tight" href="/dashboard">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline-block">Intune Assignment Checker</span>
            </a>
          </div>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className={`transition-colors hover:text-foreground/80 ${pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              Dashboard
            </Link>
             <Link
              href="/user-assignments"
              className={`flex items-center gap-2 transition-colors hover:text-foreground/80 ${pathname === '/user-assignments' ? 'text-foreground' : 'text-foreground/60'}`}
            >
              <Users className="h-4 w-4" />
              <span>User Assignments</span>
            </Link>
          </nav>

           {/* Mobile Navigation - simplified */}
           <nav className="flex md:hidden items-center gap-4 text-sm font-medium ml-auto mr-4">
             <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
                <ArrowLeft className="h-5 w-5" />
             </Link>
           </nav>

          <div className="flex flex-1 items-center justify-end space-x-4">
            <SignOutButton />
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8 h-[calc(100vh-4rem)]">
        {children}
      </main>

       <Footer />
    </div>
  );
}
