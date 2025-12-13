"use client";

import { motion } from "framer-motion";
import { SignInButton } from "~/app/_components/sign-in-button";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { ChevronRight, Database, Github, ShieldCheck } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4 pt-12 text-center">
      {/* Gentle background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.primary.DEFAULT/0.08),transparent_40%)] pointer-events-none" />
      
      <div className="relative z-10 max-w-5xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-7xl lg:text-8xl text-foreground">
            See Every Assignment. <br />
            <span className="gradient-text">Miss Nothing.</span>
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          Audit Microsoft Intune assignments in minutes. Find unassigned policies, detect drift,
          and export a report you can share.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center justify-center gap-4"
        >
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <SignInButton
              text="Audit My Tenant"
              className="h-12 px-8 text-base cursor-pointer"
            />

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 border-border bg-background px-8 text-base hover:bg-muted/50 cursor-pointer"
            >
              <Link href="#screenshots">See screenshots</Link>
            </Button>
          </div>

          <Link
            href="https://github.com/ugurkocde/intuneassignments-website"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            Open source on GitHub
          </Link>

          <div className="mt-2 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary/80" />
              <span>Read-only Graph access</span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="inline-flex items-center gap-2">
              <Database className="h-4 w-4 text-primary/80" />
              <span>No data storage</span>
            </div>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="inline-flex items-center gap-2">
              <Github className="h-4 w-4 text-primary/80" />
              <span>Open source</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <Link
          href="#features"
          className="flex flex-col items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Explore Features</span>
          <ChevronRight className="h-4 w-4 rotate-90 animate-bounce" />
        </Link>
      </motion.div>
    </section>
  );
}
