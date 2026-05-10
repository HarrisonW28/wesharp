import type { ReactNode } from "react";

import { FinanceChrome } from "./finance-chrome";

export default function AdminFinanceLayout({ children }: { children: ReactNode }) {
  return <FinanceChrome>{children}</FinanceChrome>;
}
