"use client";

import Link from "next/link";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import { Footer } from "~/components/footer";

export default function TermsPage() {
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Use</h1>
            <p className="text-muted-foreground">Effective: November 15, 2025</p>
          </div>

          <section className="space-y-4">
            <p className="leading-relaxed text-muted-foreground">
              These Terms of Use ("Terms") govern your access to and use of Intune Assignment Checker (the "Service"). By using the Service, you agree to these Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Access and Eligibility</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                You must have authority to access your Microsoft tenant and Intune data.
              </li>
              <li>
                You are responsible for complying with your organization’s policies and applicable laws.
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Use of the Service</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                The Service requests read-only Microsoft Graph permissions to retrieve Intune configurations and visualize assignments.
              </li>
              <li>
                Visualizations and data are provided for informational purposes and auditing support.
              </li>
              <li>
                Do not misuse the Service (e.g., attempt to bypass security, reverse engineer, or overload it).
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which explains what we access and how we handle data.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Disclaimer</h2>
            <p className="text-muted-foreground">
              The Service is provided on an "as is" and "as available" basis without warranties of any kind. We do not warrant that visualizations are error-free, complete, or suitable for any particular purpose. Validate outputs against your tenant as needed.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or revenues resulting from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Changes</h2>
            <p className="text-muted-foreground">
              We may modify these Terms to reflect improvements or changes to the Service. Continued use constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Contact</h2>
            <p className="text-muted-foreground">
              Questions about these Terms? Contact us at: <a href="mailto:support@ugurlabs.com" className="text-primary hover:underline">support@ugurlabs.com</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
