"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { NavSection } from "@/config/navigation";

const NavSectionsContext = createContext<NavSection[] | null>(null);

export function NavSectionsProvider({
  sections,
  children,
}: {
  sections: NavSection[];
  children: ReactNode;
}) {
  return <NavSectionsContext.Provider value={sections}>{children}</NavSectionsContext.Provider>;
}

export function useNavSections(): NavSection[] {
  const ctx = useContext(NavSectionsContext);
  if (ctx === null) {
    throw new Error("useNavSections must be used within NavSectionsProvider.");
  }
  return ctx;
}
