"use client";

import { motion } from "framer-motion";
import { SignInButton } from "~/app/_components/sign-in-button";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { Github, ChevronRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-20 text-center">
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
          Free, open-source tool to visualize and audit your Microsoft Intune policy assignments. 
          Find gaps, explore relationships, and ensure compliance in seconds.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <SignInButton 
            text="Get Started" 
            className="h-12 px-8 text-base cursor-pointer" 
          />
          
          <Button asChild variant="outline" size="lg" className="h-12 border-border bg-background px-8 text-base hover:bg-muted/50 cursor-pointer">
            <Link href="https://github.com/ugurkocde/intuneassignments-website" target="_blank">
              <Github className="mr-2 h-5 w-5" />
              View on GitHub
            </Link>
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <span>Explore Features</span>
          <ChevronRight className="h-4 w-4 rotate-90 animate-bounce" />
        </div>
      </motion.div>
    </section>
  );
}
