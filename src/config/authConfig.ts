import type { Configuration } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";
import { env } from "~/env";

export const msalConfig: Configuration = {
  auth: {
    clientId: env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${env.NEXT_PUBLIC_AZURE_AD_TENANT_ID}`,
    redirectUri: env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI,
    postLogoutRedirectUri: "/",
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            // console.info(message);
            return;
          case LogLevel.Verbose:
            // console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest = {
  scopes: [
    "User.Read",
    "User.Read.All",
    "GroupMember.Read.All",
    "DeviceManagementManagedDevices.Read.All",
    "DeviceManagementApps.Read.All",
    "DeviceManagementConfiguration.Read.All",
    "DeviceManagementServiceConfig.Read.All",
    "DeviceManagementScripts.Read.All",
    "CloudPC.Read.All"
  ],
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

