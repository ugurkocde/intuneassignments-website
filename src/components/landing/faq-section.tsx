"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"

const faqs = [
  {
    q: "What permissions does the app request?",
    a: "Only read-only Microsoft Graph permissions required to fetch Intune configuration, assignments, and related directory objects. You can review the exact scopes in the Trust section above.",
  },
  {
    q: "Is my data stored anywhere?",
    a: "No. The app does not store your tenant data in a database. It reads from Microsoft Graph and renders results in your session.",
  },
  {
    q: "Do you support GCC / sovereign clouds?",
    a: "Currently the app is optimized for the public Microsoft cloud. Support for GCC/sovereign clouds can be added by making the Graph endpoints and authority configurable.",
  },
  {
    q: "Is it free?",
    a: "Yes. It’s free and open-source.",
  },
  {
    q: "Do I need admin consent?",
    a: "In many tenants, yes—some of the read scopes typically require an admin to grant consent before users can sign in.",
  },
  {
    q: "Can I use this across multiple tenants?",
    a: "Yes, as long as the app registration and consent model match your environment. Multi-tenant scenarios can be supported depending on how you configure Azure AD app registration.",
  },
]

export function FaqSection() {
  return (
    <section
      id="faq"
      className="relative z-10 border-t border-border bg-muted/30 px-4 py-24 sm:px-6 lg:px-8 scroll-mt-24"
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            FAQ
          </h2>
          <p className="text-lg text-muted-foreground">
            Common questions about security, consent, and usage.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item, idx) => (
            <AccordionItem key={item.q} value={`item-${idx}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
