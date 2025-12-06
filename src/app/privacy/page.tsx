"use client";

import Link from "next/link";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { Footer } from "~/components/footer";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50/40 dark:bg-gray-900/40">
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 sm:px-8">
          <div className="mr-8 flex items-center gap-4">
            <Link className="flex items-center space-x-2 font-bold text-xl tracking-tight" href="/">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline-block">Intune Assignment Checker</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <Link href="/" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 sm:px-8 py-12">
        <div className="space-y-8 animate-in fade-in duration-500">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
            <p className="text-muted-foreground">Effective: November 15, 2025</p>
          </div>

          <section className="space-y-4">
            <p className="leading-relaxed text-muted-foreground">
              This Privacy Policy explains how Intune Assignment Checker ("we", "our", or "the Service") handles information when you use the app to visualize and analyze assignments from Microsoft Intune. We designed the Service to minimize data collection and focus on privacy by default.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">What We Access</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Authentication via Microsoft OAuth 2.0 (Azure AD).</strong> We request read-only Microsoft Graph permissions necessary to list Intune configurations, assignments, and related group memberships.
              </li>
              <li>
                <strong className="text-foreground">Intune configuration metadata.</strong> We access settings required to render your assignment visualizations (policies, profiles, scripts, assignments, and related details) in a read-only capacity.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">How We Process Data</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                We do not persist your Intune configuration data. Data is retrieved during your session via Microsoft Graph and used solely to build the visualization in your browser.
              </li>
              <li>
                Access tokens are managed by your browser session to call Microsoft Graph; we do not persist them server-side.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Analytics & Cookies</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                We use privacy-friendly analytics (Plausible) to understand aggregate usage without cookies or personal identifiers. Analytics are used to improve stability and usability, not to track individuals.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Plausible Analytics is 100% cookieless and does not track personal data or use browser fingerprinting.</li>
                <li>We collect only aggregated, anonymous metrics such as page views, referrers, and device types.</li>
                <li>Your consent preference for analytics is stored in localStorage (not a cookie) and remains on your device only.</li>
                <li>You can change your analytics preference at any time by clearing your browser's local storage or declining via the consent banner.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell or share your configuration data with third parties. Data accessed from Microsoft Graph is used solely to visualize your assignments.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Security</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Authentication is handled via Microsoft OAuth 2.0 (Azure AD).</li>
              <li>Only read-only Graph permissions are requested for Intune data.</li>
              <li>We avoid storing tenant data; visualizations are generated on demand and not persisted.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Data Retention</h2>
            <p className="text-muted-foreground">
              We do not retain your Intune configuration data. Operational logs may exist temporarily within hosting provider systems as part of standard logging.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Your Choices</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>You can disconnect at any time by signing out of the app.</li>
              <li>You can revoke the app’s permissions from your Microsoft account/tenant to prevent future access.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Children’s Privacy</h2>
            <p className="text-muted-foreground">
              The Service is intended for professional/enterprise use and is not directed to children.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Changes</h2>
            <p className="text-muted-foreground">
              We may update this policy to reflect improvements or operational changes. If we make material changes, we will update the effective date above.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
            <p className="text-muted-foreground">
              Questions about this policy? Contact us at: <a href="mailto:support@ugurlabs.com" className="text-primary hover:underline">support@ugurlabs.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
