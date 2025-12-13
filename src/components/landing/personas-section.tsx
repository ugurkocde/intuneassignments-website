import { Briefcase, Shield, Users } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"

const personas = [
  {
    title: "Intune Administrators",
    description:
      "Get instant visibility into what’s assigned and where gaps exist—without exporting CSVs or stitching reports together.",
    icon: Users,
  },
  {
    title: "Security Teams",
    description:
      "Verify baseline coverage, spot drift quickly, and build confidence that critical policies are actually applied.",
    icon: Shield,
  },
  {
    title: "MSPs & Consultants",
    description:
      "Assess tenant configuration fast, document findings, and show clear before/after comparisons to stakeholders.",
    icon: Briefcase,
  },
]

export function PersonasSection() {
  return (
    <section
      id="personas"
      className="relative z-10 border-y border-border bg-muted/20 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Who is this for?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Built for teams who need clear answers about Intune assignments.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {personas.map((p) => (
            <Card key={p.title} className="bg-card/80">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <p.icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{p.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {p.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
