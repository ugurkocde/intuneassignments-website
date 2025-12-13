"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { BarChart3, Columns2, GitGraph, CheckCircle2 } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { cn } from "~/lib/utils"

const screenshots = [
  {
    value: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    title: "A clear audit dashboard",
    description:
      "Quickly spot unassigned policies, understand coverage, and export a report when you need to prove compliance.",
    highlights: [
      "Spot unassigned policies instantly",
      "Measure coverage at a glance",
      "Export findings when you need proof",
    ],
    src: "/screenshots/dashboard.png",
    alt: "Dashboard screenshot",
  },
  {
    value: "explorer",
    label: "Explorer",
    icon: GitGraph,
    title: "Explore assignments as a graph",
    description:
      "Navigate relationships between policies and groups visually, and search nodes instantly to find exactly what’s applied where.",
    highlights: [
      "Visualize relationships clearly",
      "Search nodes in seconds",
      "Understand impact before changes",
    ],
    src: "/screenshots/explorer.png",
    alt: "Explorer screenshot",
  },
  {
    value: "compare",
    label: "Compare",
    icon: Columns2,
    title: "Compare policies side by side",
    description:
      "Diff assignments and settings to understand what changed, what differs, and what might be causing drift.",
    highlights: ["Side-by-side diffs", "Catch drift early", "Validate standardization"],
    src: "/screenshots/compare.png",
    alt: "Compare screenshot",
  },
]

export function ScreenshotsSection() {
  return (
    <section
      id="screenshots"
      className="relative z-10 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.18),transparent_55%)] blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.10),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-0 right-0 h-64 w-64 bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.08),transparent_60%)] blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Product screenshots
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            See how fast you can go from “What’s assigned?” to a confident answer.
          </p>
        </div>

        <Tabs defaultValue={screenshots[0]?.value} className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <TabsList className="h-11 rounded-full bg-muted/60 p-1 shadow-sm ring-1 ring-border/60 backdrop-blur-md">
              {screenshots.map((s) => (
                <TabsTrigger
                  key={s.value}
                  value={s.value}
                  className="rounded-full px-4"
                >
                  <s.icon className="h-4 w-4" />
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {screenshots.map((s) => (
            <TabsContent key={s.value} value={s.value} className="mt-8">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid items-center gap-10 lg:grid-cols-2"
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-sm font-medium text-foreground/80 backdrop-blur">
                    <s.icon className="h-4 w-4 text-primary" />
                    <span>{s.label}</span>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                      {s.title}
                    </h3>
                    <p className="text-muted-foreground">{s.description}</p>
                  </div>

                  <ul className="grid gap-3 text-sm text-muted-foreground">
                    {s.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative group">
                  {/* App/window frame */}
                  <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/60 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] ring-1 ring-border/40 backdrop-blur">
                    <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground">
                        {s.label}
                      </div>
                    </div>

                    <div className="relative aspect-[16/9]">
                      <Image
                        src={s.src}
                        alt={s.alt}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className={cn(
                          "object-cover transition-transform duration-500",
                          "group-hover:scale-[1.02]"
                        )}
                        priority={s.value === screenshots[0]?.value}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.06))]" />
                    </div>
                  </div>

                  {/* Subtle glow */}
                  <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(circle_at_center,theme(colors.primary.DEFAULT/0.18),transparent_60%)] blur-2xl" />
                </div>
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
