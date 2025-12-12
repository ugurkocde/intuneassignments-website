"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Footer } from "~/components/footer";
import { AppHeader } from "~/app/_components/app-header";

export default function AssignmentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/40 dark:bg-gray-900/40">
      <AppHeader />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        {children}
      </main>

      <Footer />
    </div>
  );
}


