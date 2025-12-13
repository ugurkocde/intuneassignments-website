"use client"

import Link from "next/link"
import { useState } from "react"
import { ClipboardCheck, Menu, X } from "lucide-react"

import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { SignInButton } from "~/app/_components/sign-in-button"

const navItems = [
  { href: "#features", label: "Features" },
  { href: "#screenshots", label: "Screenshots" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#faq", label: "FAQ" },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline-block">Intune Assignment Checker</span>
            <span className="sm:hidden">Intune Checker</span>
          </Link>

          <nav className="hidden md:flex items-center justify-center gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-foreground/70 transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <div className="hidden sm:block">
              <SignInButton text="Sign In" className="h-9" />
            </div>

            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className={cn("md:hidden overflow-hidden transition-[max-height,opacity]", open ? "max-h-96 opacity-100 pb-4" : "max-h-0 opacity-0")}
        >
          <nav className="grid gap-2 pt-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 sm:hidden">
              <SignInButton text="Sign In" className="w-full" />
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}
