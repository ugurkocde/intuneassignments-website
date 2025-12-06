"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "~/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  colorClass: string; // e.g. "text-blue-400", "text-orange-400"
  delay?: number;
}

export function FeatureCard({ title, description, icon: Icon, colorClass, delay = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="glass-card group relative flex flex-col gap-4 overflow-hidden rounded-xl p-6 transition-colors hover:border-primary/20 dark:glass-card-dark"
    >
      <div className={cn("absolute left-0 top-0 h-full w-1 opacity-50 transition-opacity group-hover:opacity-100", colorClass.replace("text-", "bg-"))} />
      
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg bg-primary/5 transition-transform group-hover:scale-110", colorClass)}>
        <Icon className="h-6 w-6" />
      </div>
      
      <div>
        <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      <div className={cn("absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[60px] opacity-0 transition-opacity group-hover:opacity-10", colorClass.replace("text-", "bg-"))} />
    </motion.div>
  );
}
