"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Footer } from "~/components/footer";
import { LandingHeader } from "~/components/landing/landing-header";
import { HeroSection } from "~/components/landing/hero-section";
import { FeaturesSection } from "~/components/landing/features-section";
import { ScreenshotsSection } from "~/components/landing/screenshots-section";
import { PersonasSection } from "~/components/landing/personas-section";
import { HowItWorksSection } from "~/components/landing/how-it-works-section";
import { TrustSection } from "~/components/landing/trust-section";
import { FaqSection } from "~/components/landing/faq-section";
import { FinalCtaSection } from "~/components/landing/final-cta-section";

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
      <LandingHeader />

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <ScreenshotsSection />
        <PersonasSection />
        <HowItWorksSection />
        <TrustSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      
      <Footer />
    </div>
  );
}
