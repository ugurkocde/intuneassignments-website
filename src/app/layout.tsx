import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";

import { MSALProviderWrapper } from "~/app/_components/msal-provider";
import { QueryProvider } from "~/app/_components/query-provider";

export const metadata: Metadata = {
  title: "Intune Assignment Checker",
  description: "Analyze and audit Intune assignments",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <MSALProviderWrapper>
          <QueryProvider>{children}</QueryProvider>
        </MSALProviderWrapper>
        <Script
          src="https://plausible.io/js/pa-N4da2LCb-mmTgGsLrF4jx.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {`window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
  plausible.init()`}
        </Script>
      </body>
    </html>
  );
}
