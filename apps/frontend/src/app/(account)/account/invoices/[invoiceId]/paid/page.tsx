import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { NavBreadcrumbs } from "@/components/layout/NavBreadcrumbs";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ invoiceId: string }>;
};

/** Stripe replaces `{CHECKOUT_SESSION_ID}` in `STRIPE_CHECKOUT_SUCCESS_URL` → this `[invoiceId]` segment is the `cs_*` id. */
export default async function StripeCheckoutInvoicePaidReturnPage({ params }: Props) {
  const { invoiceId } = await params;
  const checkoutSessionId =
    typeof invoiceId === "string" && invoiceId.startsWith("cs_") ? invoiceId : null;

  return (
    <div className="space-y-8">
      <NavBreadcrumbs suffix={[{ label: "Payment received" }]} />
      <PageHeader
        title="Thank you"
        description="Stripe sent you back here after checkout. Your bank charge may still be confirming."
      />

      <Card className="border-emerald-500/20 shadow-sm">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div className="space-y-1">
            <CardTitle className="text-lg">Payment submitted</CardTitle>
            <CardDescription>
              We apply balances when Stripe notifies our servers — usually within a minute. Refresh your invoice if the
              status still looks unpaid.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          {checkoutSessionId ? (
            <p className="text-xs text-muted-foreground">
              Checkout reference <span className="font-mono">{checkoutSessionId}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/account/invoices">Back to invoices</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/account/subscription">Subscription</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
