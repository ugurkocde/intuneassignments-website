"use client";

import { Network, AlertCircle, FileText } from "lucide-react";
import { FeatureCard } from "./feature-card";

export function FeaturesSection() {
  const features = [
    {
      title: "Assignment Explorer",
      description:
        "Explore assignments as an interactive network. Navigate relationships between policies and groups, and search nodes instantly.",
      icon: Network,
      colorClass: "text-blue-500",
    },
    {
      title: "Unassigned Policy Detection",
      description: "Automatically identify policies that have no assignments. Prevent configuration drift and ensure all your security baselines are actually applied.",
      icon: AlertCircle,
      colorClass: "text-orange-500",
    },
    {
      title: "Comprehensive Audit Dashboard",
      description: "Get a high-level overview of all your Intune policies. Track assignment counts, export reports, and maintain a clean environment.",
      icon: FileText,
      colorClass: "text-green-500",
    },
  ];

  return (
    <section
      id="features"
      className="relative z-10 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to audit Intune
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Stop guessing which policies are assigned. Visual tools designed for modern IT engineers.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
