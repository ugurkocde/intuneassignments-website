"use client";

import { useMsal } from "@azure/msal-react";
import { LogOut } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export const SignOutButton = ({
  iconOnly = false,
  className,
}: {
  iconOnly?: boolean;
  className?: string;
}) => {
  const { instance } = useMsal();

  const handleLogout = () => {
    instance.logoutPopup({
      postLogoutRedirectUri: "/",
      mainWindowRedirectUri: "/",
    });
  };

  return (
    <Button
      variant="outline"
      onClick={handleLogout}
      size={iconOnly ? "icon" : undefined}
      className={cn(iconOnly && "px-0", className)}
      aria-label={iconOnly ? "Sign out" : undefined}
    >
      {iconOnly ? <LogOut className="h-4 w-4" /> : "Sign Out"}
    </Button>
  );
};

