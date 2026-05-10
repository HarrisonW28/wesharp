import { CalendarClock, ClipboardList, Package, Receipt, Repeat, Utensils } from "lucide-react";

function BrowserChromeBar() {
  return (
    <div
      className="flex items-center gap-2 border-b border-border/80 bg-muted/50 px-3 py-2"
      aria-hidden
    >
      <span className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_62%_62%)] opacity-90" />
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(45_90%_52%)] opacity-90" />
        <span className="h-2.5 w-2.5 rounded-full bg-[hsl(145_40%_48%)] opacity-90" />
      </span>
      <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground sm:text-xs">
        wesharp.uk/account/dashboard
      </div>
    </div>
  );
}

function PreviewCaption({ children }: { children: string }) {
  return (
    <figcaption className="px-1 text-center text-xs leading-snug text-muted-foreground">{children}</figcaption>
  );
}

/** Stylised full-width preview — not a bitmap screenshot; updates cleanly when the real portal UI changes. */
export function PortalOverviewMarketingPreview() {
  return (
    <figure className="mx-auto max-w-3xl space-y-2">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10">
        <BrowserChromeBar />
        <div className="space-y-4 bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6">
          <header className="space-y-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">Hello, Alex</p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sample Kitchen Ltd</span>
              <span> — collections, orders, and invoices in one place.</span>
            </p>
          </header>

          <div className="flex flex-wrap gap-2">
            {["My bookings", "My orders", "Invoices", "Knives"].map((label) => (
              <span
                key={label}
                className="rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarClock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Next collection
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Wed 14 May · AM window</p>
              <p className="mt-1 text-xs font-medium text-foreground">Manchester — prep kitchen</p>
              <span className="mt-3 inline-flex rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                Confirmed
              </span>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Package className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Active orders
              </div>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                  <span className="text-muted-foreground">#1042</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    In sharpening
                  </span>
                </li>
                <li className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">#1038</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
                    Returned
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Receipt className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                Invoices
              </div>
              <p className="mt-3 text-xs text-muted-foreground">One invoice awaiting payment · totals in GBP</p>
              <div className="mt-3 flex gap-2">
                <ClipboardList className="h-8 w-8 shrink-0 text-muted-foreground/40" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
      <PreviewCaption>
        Illustrative preview of the signed-in overview — real labels and data come from your live account.
      </PreviewCaption>
    </figure>
  );
}

export function PortalSubscriptionMarketingPreview() {
  return (
    <figure className="mx-auto max-w-3xl space-y-2">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10">
        <div className="flex items-center gap-2 border-b border-border/80 bg-muted/50 px-3 py-2" aria-hidden>
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(0_62%_62%)] opacity-90" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(45_90%_52%)] opacity-90" />
            <span className="h-2.5 w-2.5 rounded-full bg-[hsl(145_40%_48%)] opacity-90" />
          </span>
          <div className="ml-2 min-w-0 flex-1 truncate rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground sm:text-xs">
            wesharp.uk/account/subscription
          </div>
        </div>
        <div className="space-y-4 bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6">
          <header className="flex flex-wrap items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" aria-hidden />
            <div>
              <p className="text-base font-semibold text-foreground">Your plan</p>
              <p className="text-xs text-muted-foreground">Allowances update as collections complete.</p>
            </div>
          </header>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
              <p className="text-xs font-medium text-muted-foreground">Collection visits</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">2 / 4 included</p>
              <p className="mt-1 text-[11px] text-muted-foreground">This billing period</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
              <p className="text-xs font-medium text-muted-foreground">Knives (allowance)</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">28 / 40 included</p>
              <p className="mt-1 text-[11px] text-muted-foreground">Tracked in your portal</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3">
            <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Programme kitchens see plain-language usage here; pay-as-you-go accounts may show a lighter summary.
            </p>
          </div>
        </div>
      </div>
      <PreviewCaption>
        Illustrative preview of subscription usage — figures appear once you are on a programme with allowances.
      </PreviewCaption>
    </figure>
  );
}
