"use client";

import { useMsal } from "@azure/msal-react";
import { loginRequest } from "~/config/authConfig";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface SignInButtonProps {
  text?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export const SignInButton = ({ text = "Sign in with Microsoft", className, variant = "default" }: SignInButtonProps) => {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await instance.loginPopup(loginRequest);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleLogin} 
      disabled={isLoading} 
      size="lg" 
      variant={variant}
      className={cn("font-semibold", className)}
    >
      {isLoading ? "Signing in..." : text}
    </Button>
  );
};
