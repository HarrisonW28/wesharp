import Link from "next/link";
import { Undo2 } from "lucide-react";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function StripeCheckoutCanceledReturnPage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        homeHref="/account/dashboard"
        items={[{ label: "Invoices", href: "/account/invoices" }, { label: "Checkout canceled" }]}
      />
      <PageHeader
        title="Checkout canceled"
        description="No payment was taken. You can try again from an invoice or your subscription page whenever you’re ready."
      />

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <Undo2 className="mt-0.5 h-8 w-8 shrink-0 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <CardTitle className="text-lg">Nothing charged</CardTitle>
            <CardDescription>If you closed Stripe or clicked back, your invoice balance is unchanged.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm">
            <Link href="/account/invoices">Invoices</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/account/subscription">Subscription</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
