"use client";

import { motion } from "framer-motion";

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  delay?: number;
}

export function StepCard({ number, title, description, delay = 0 }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="relative flex flex-col items-center text-center md:items-start md:text-left"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-background text-xl font-bold text-primary shadow-sm shadow-primary/10 backdrop-blur-sm z-10">
        {number}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
}
