"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { type ReactNode, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { resolvedClerkPublishableKey } from "@/lib/clerk-publishable-key";

const publishableKey = resolvedClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInFallbackRedirectUrl="/auth/continue"
      signUpFallbackRedirectUrl="/auth/continue"
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
