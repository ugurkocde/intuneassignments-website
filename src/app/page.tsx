"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Footer } from "~/components/footer";
import { HeroSection } from "~/components/landing/hero-section";
import { FeaturesSection } from "~/components/landing/features-section";
import { HowItWorksSection } from "~/components/landing/how-it-works-section";
import { FinalCtaSection } from "~/components/landing/final-cta-section";
import { OpenSourceBadge } from "~/components/landing/open-source-badge";

export default function Home() {
  const isAuthenticated = useIsAuthenticated();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 selection:text-primary">
      <OpenSourceBadge />
      
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FinalCtaSection />
      </main>
      
      <Footer />
    </div>
  );
}
