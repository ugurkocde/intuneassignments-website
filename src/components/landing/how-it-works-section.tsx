"use client";

import { StepCard } from "./step-card";

export function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      title: "Sign In Securely",
      description: "Log in with your Microsoft 365 account. We use read-only Graph API permissions to fetch your configuration safely.",
    },
    {
      number: 2,
      title: "Automatic Analysis",
      description: "The tool scans your Intune environment, mapping out policies, applications, and their assignments to groups.",
    },
    {
      number: 3,
      title: "Explore & Audit",
      description: "Visualize relationships in the graph view, find unassigned policies in the dashboard, and export your findings.",
    },
  ];

  return (
    <section
      id="how-it-works"
      className="relative z-10 border-y border-border bg-muted/30 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="text-muted-foreground">Simple, secure, and fast.</p>
        </div>

        <div className="relative">
          {/* Connecting line for desktop */}
          <div className="absolute left-0 top-6 hidden h-0.5 w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent md:block" />

          <div className="grid gap-12 md:grid-cols-3 md:gap-8">
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                {...step}
                delay={index * 0.2}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
