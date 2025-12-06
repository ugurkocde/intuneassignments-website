"use client";

import { SignInButton } from "~/app/_components/sign-in-button";
import { motion } from "framer-motion";

export function FinalCtaSection() {
  return (
    <section className="relative z-10 overflow-hidden px-4 py-24 text-center sm:px-6 lg:px-8">
      
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.1),transparent_50%)] pointer-events-none" />
      
      <div className="relative mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Ready to See What You're Missing?
          </h2>
          <p className="mb-10 text-xl text-muted-foreground">
            Free forever. No credit card required. Your data stays with Microsoft.
          </p>
          
          <div className="flex justify-center">
            <SignInButton 
              text="Get Started Now" 
              className="h-14 px-10 text-lg" 
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
