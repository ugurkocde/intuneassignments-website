"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Github } from "lucide-react";

export function OpenSourceBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="fixed top-4 right-4 z-50 hidden sm:block"
    >
      <Link
        href="https://github.com/ugurkocde/IntuneAssignments"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-muted hover:text-primary shadow-sm"
      >
        <Github className="h-4 w-4" />
        <span>Open Source</span>
      </Link>
    </motion.div>
  );
}
