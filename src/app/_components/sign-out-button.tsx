"use client";

import { useMsal } from "@azure/msal-react";
import { Button } from "~/components/ui/button";

export const SignOutButton = () => {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: "/",
      mainWindowRedirectUri: "/",
    });
  };

  return (
    <Button variant="outline" onClick={handleLogout}>
      Sign Out
    </Button>
  );
};

