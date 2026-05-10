import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Boxes,
  Calculator,
  Coins,
  Landmark,
  LayoutDashboard,
  Receipt,
  Repeat,
  ShoppingCart,
  Upload,
} from "lucide-react";

export const FINANCE_BASE = "/admin/finance";

export type FinanceSectionMeta = {
  href: string;
  title: string;
  /** Short hint for hover / accessibility — operator-facing, not release notes */
  description: string;
  icon: LucideIcon;
  /** User must have every listed permission */
  allOf?: string[];
  /** User needs at least one (only evaluated when `allOf` is unset) */
  anyOf?: string[];
};

export const FINANCE_SECTIONS: FinanceSectionMeta[] = [
  {
    href: FINANCE_BASE,
    title: "Overview",
    description: "Balances, payments-in-period, costs snapshot, and subscriptions context.",
    icon: LayoutDashboard,
    allOf: ["payments.view", "invoices.view"],
  },
  {
    href: `${FINANCE_BASE}/costs`,
    title: "Cost catalogue",
    description: "Supplier lines, amounts, and recurring commitments.",
    icon: Calculator,
    allOf: ["costs.view"],
  },
  {
    href: `${FINANCE_BASE}/costs/import`,
    title: "Import costs",
    description: "Upload a spreadsheet, review validation, then commit.",
    icon: Upload,
    allOf: ["costs.view"],
  },
  {
    href: `${FINANCE_BASE}/consumables`,
    title: "Consumables",
    description: "Stock levels, usage logs, and restock estimates.",
    icon: Boxes,
    allOf: ["costs.view"],
  },
  {
    href: `${FINANCE_BASE}/cost-ledger`,
    title: "Cost ledger",
    description: "Manual allocations to orders, routes, customers, and subscriptions.",
    icon: Coins,
    allOf: ["costs.view"],
  },
  {
    href: "/admin/payments",
    title: "Payments",
    description: "Recorded payments and reconciliation.",
    icon: Banknote,
    allOf: ["payments.view"],
  },
  {
    href: "/admin/invoices",
    title: "Invoices",
    description: "Issue status, ageing, and detail.",
    icon: Receipt,
    allOf: ["invoices.view"],
  },
  {
    href: "/admin/subscription-plans",
    title: "Plans & pricing",
    description: "Published plans and blade pricing.",
    icon: ShoppingCart,
    anyOf: ["subscriptions.view", "pricing.view"],
  },
  {
    href: "/admin/subscriptions",
    title: "Active subscriptions",
    description: "Live customer subscriptions.",
    icon: Repeat,
    allOf: ["subscriptions.view"],
  },
];

export function visibleFinanceSections(permissions: ReadonlySet<string>): FinanceSectionMeta[] {
  return FINANCE_SECTIONS.filter((row) => {
    if (row.allOf?.length) {
      return row.allOf.every((p) => permissions.has(p));
    }
    if (row.anyOf?.length) {
      return row.anyOf.some((p) => permissions.has(p));
    }
    return false;
  });
}
