import { Database, KeyRound, ShieldCheck } from "lucide-react"

import { Badge } from "~/components/ui/badge"
import { loginRequest } from "~/config/authConfig"

const trustPoints = [
  {
    title: "Read-only access",
    description:
      "We only request Microsoft Graph scopes needed to read your Intune configuration and assignments.",
    icon: ShieldCheck,
  },
  {
    title: "No data storage",
    description:
      "Your data isn’t stored in a database. We fetch what’s needed from Microsoft Graph and render it in your session.",
    icon: Database,
  },
  {
    title: "Minimal permissions",
    description:
      "The app is designed to operate with the smallest set of permissions possible for a complete assignment audit.",
    icon: KeyRound,
  },
]

export function TrustSection() {
  const scopes = loginRequest.scopes

  return (
    <section
      id="trust"
      className="relative z-10 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Trust & security
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Designed to be safe to run in production tenants.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {trustPoints.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-border bg-card/60 p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">{p.title}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-border bg-muted/20 p-6">
          <h3 className="text-base font-semibold text-foreground">
            Requested Microsoft Graph permissions
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            These scopes are required to read policies, assignments, and related objects.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {scopes.map((scope) => (
              <Badge key={scope} variant="outline" className="font-mono">
                {scope}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
