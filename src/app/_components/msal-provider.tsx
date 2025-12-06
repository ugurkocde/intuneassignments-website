"use client";

import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "~/config/authConfig";
import { useEffect, useState } from "react";

const msalInstance = new PublicClientApplication(msalConfig);

export function MSALProviderWrapper({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await msalInstance.initialize();
      setIsInitialized(true);
    };
    initialize();
  }, []);

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}

