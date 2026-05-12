import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  MapPin,
  Package,
  Receipt,
  Repeat,
  ShieldCheck,
  Truck,
  Utensils,
} from "lucide-react";

import { cn } from "@/lib/utils";

const DEFAULT_PREVIEW_PATH = "wesharp.uk/account/dashboard";

function BrowserChromeBar({ path = DEFAULT_PREVIEW_PATH }: { path?: string }) {
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
        {path}
      </div>
    </div>
  );
}

function PreviewCaption({ children }: { children: string }) {
  return (
    <figcaption className="px-1 text-center text-xs leading-snug text-muted-foreground">
      {children}
    </figcaption>
  );
}

/** Stylised browser-style frame used by all marketing portal previews. */
function PortalPreviewFrame({
  path,
  caption,
  children,
}: {
  path?: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="mx-auto max-w-3xl space-y-2">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-lg shadow-black/10 ring-1 ring-black/5 dark:shadow-black/40 dark:ring-white/10">
        <BrowserChromeBar path={path} />
        <div className="space-y-4 bg-gradient-to-b from-background to-muted/20 p-4 sm:p-6">
          {children}
        </div>
      </div>
      <PreviewCaption>{caption}</PreviewCaption>
    </figure>
  );
}

type PhotoStage = "pickup" | "workshop" | "after" | "qa";

const PHOTO_STAGE_TONE: Record<PhotoStage, string> = {
  pickup: "from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/30",
  workshop: "from-slate-200 to-slate-300 dark:from-slate-800/60 dark:to-slate-700/40",
  after: "from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/30",
  qa: "from-sky-100 to-sky-200 dark:from-sky-900/40 dark:to-sky-800/30",
};

const PHOTO_STAGE_LABEL: Record<PhotoStage, string> = {
  pickup: "Pickup",
  workshop: "Workshop",
  after: "After",
  qa: "QA",
};

/**
 * Illustrative photo thumbnail — gradient swatch + a stylised knife silhouette
 * stands in for a real uploaded photo so the preview reads as "image evidence".
 */
function KnifePhotoThumb({
  stage,
  className,
}: {
  stage: PhotoStage;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-gradient-to-br",
        PHOTO_STAGE_TONE[stage],
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 56 56" className="h-full w-full">
        <path
          d="M6 36 L42 18 L48 22 L12 40 Z"
          className="fill-foreground/60"
        />
        <rect x="40" y="20" width="10" height="8" rx="1" className="fill-foreground/80" />
      </svg>
      <Camera className="absolute right-1 top-1 h-3 w-3 text-foreground/40" aria-hidden />
      <span className="absolute bottom-1 left-1 rounded bg-background/85 px-1 py-0.5 text-[8px] font-medium text-foreground">
        {PHOTO_STAGE_LABEL[stage]}
      </span>
    </div>
  );
}

export function PortalOverviewMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/dashboard"
      caption="Illustrative preview of the signed-in overview — real labels and data come from your live account."
    >
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
    </PortalPreviewFrame>
  );
}

export function PortalSubscriptionMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/subscription"
      caption="Illustrative preview of subscription usage — figures appear once you are on a programme with allowances."
    >
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
    </PortalPreviewFrame>
  );
}

const ORDER_TIMELINE_STEPS: { label: string; state: "complete" | "current" | "upcoming"; hint?: string }[] = [
  { label: "Collected", state: "complete", hint: "Wed 14 May · 09:42" },
  { label: "Logged & inspected", state: "complete", hint: "Workshop · 18 knives tagged" },
  { label: "In sharpening", state: "current", hint: "Lead workshop — quality pass next" },
  { label: "QA pass", state: "upcoming" },
  { label: "Returned to site", state: "upcoming" },
];

export function PortalOrderTrackingMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/orders/1042"
      caption="Illustrative order view — your live portal mirrors the workshop status and any photos uploaded against this batch."
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Order</p>
          <p className="text-base font-semibold text-foreground">#1042 · Manchester — prep kitchen</p>
          <p className="text-xs text-muted-foreground">18 knives · collected Wed 14 May</p>
        </div>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          In sharpening
        </span>
      </header>

      <ol className="relative grid gap-3 sm:grid-cols-5">
        {ORDER_TIMELINE_STEPS.map((step) => (
          <li
            key={step.label}
            className={cn(
              "rounded-lg border bg-card p-3 shadow-sm",
              step.state === "current" && "border-primary/40 ring-1 ring-primary/30",
              step.state === "upcoming" && "border-dashed bg-muted/20",
            )}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-1.5 w-1.5 rounded-full",
                  step.state === "complete" && "bg-emerald-500",
                  step.state === "current" && "bg-primary",
                  step.state === "upcoming" && "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
                {step.label}
              </p>
            </div>
            {step.hint ? (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{step.hint}</p>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Camera className="h-4 w-4 text-primary" aria-hidden />
            Photos on this batch
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Workshop uploads tagged by stage.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <KnifePhotoThumb stage="pickup" />
            <KnifePhotoThumb stage="workshop" />
            <KnifePhotoThumb stage="after" />
            <KnifePhotoThumb stage="qa" />
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ClipboardCheck className="h-4 w-4 text-primary" aria-hidden />
            Workshop inspection
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Condition:</span> mixed edge wear; two blades flagged for tip repair.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Notes:</span> Sanitised on receipt, inspected against your kit list — no missing items.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50/70 p-3 dark:border-amber-700/40 dark:bg-amber-900/20">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
        <div className="text-xs leading-relaxed text-foreground">
          <p className="font-medium">Damage report on blade #B-217</p>
          <p className="text-muted-foreground">
            Tip chip from drop damage — reground in workshop, photo attached. No charge for the regrind.
          </p>
        </div>
      </div>
    </PortalPreviewFrame>
  );
}

const KNIFE_REGISTER_ROWS: {
  tag: string;
  label: string;
  site: string;
  status: "with-you" | "in-workshop" | "returned";
  lastSeen: string;
}[] = [
  { tag: "B-217", label: "Chef · 24cm", site: "Manchester", status: "in-workshop", lastSeen: "Today" },
  { tag: "B-204", label: "Boning · 15cm", site: "Manchester", status: "with-you", lastSeen: "Sharpened 02 May" },
  { tag: "B-141", label: "Bread serrated", site: "Leeds", status: "returned", lastSeen: "Returned 28 Apr" },
  { tag: "B-098", label: "Santoku · 18cm", site: "Liverpool", status: "with-you", lastSeen: "Due collection" },
];

export function PortalKnifeRegisterMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/knives"
      caption="Illustrative blade register — each knife you tag with us keeps its own history across orders and sites."
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-foreground">Knives</p>
          <p className="text-xs text-muted-foreground">42 tracked · 4 in workshop right now</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All sites", "Manchester", "Leeds", "Liverpool"].map((label, idx) => (
            <span
              key={label}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                idx === 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-muted/40 text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Tag</th>
              <th className="px-3 py-2 font-medium">Blade</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Site</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Last update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {KNIFE_REGISTER_ROWS.map((row) => (
              <tr key={row.tag} className="bg-background">
                <td className="px-3 py-2 font-mono text-[11px] text-foreground">{row.tag}</td>
                <td className="px-3 py-2 text-foreground">{row.label}</td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{row.site}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      row.status === "with-you" &&
                        "border border-border/70 bg-muted text-foreground",
                      row.status === "in-workshop" &&
                        "border border-primary/30 bg-primary/10 text-primary",
                      row.status === "returned" &&
                        "border border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
                    )}
                  >
                    {row.status === "with-you"
                      ? "With you"
                      : row.status === "in-workshop"
                        ? "In workshop"
                        : "Returned"}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{row.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Utensils className="h-4 w-4 text-primary" aria-hidden />
          Blade history — B-217 · Chef 24cm
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <KnifePhotoThumb stage="pickup" />
          <KnifePhotoThumb stage="after" />
          <KnifePhotoThumb stage="qa" />
          <KnifePhotoThumb stage="after" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">3 services</span> in the last 6 months.
            </p>
            <p>Last inspection: tip repaired, edge geometry corrected.</p>
          </div>
        </div>
      </div>
    </PortalPreviewFrame>
  );
}

const COLLECTIONS_SCHEDULE: {
  day: string;
  date: string;
  window: string;
  site: string;
  status: "confirmed" | "tentative" | "completed";
}[] = [
  { day: "Wed", date: "14 May", window: "AM · 08:30–11:00", site: "Manchester — prep kitchen", status: "confirmed" },
  { day: "Wed", date: "14 May", window: "PM · 13:00–16:00", site: "Manchester — service kitchen", status: "confirmed" },
  { day: "Thu", date: "22 May", window: "AM · 09:00–12:00", site: "Leeds — bistro", status: "tentative" },
  { day: "Wed", date: "30 Apr", window: "AM · 08:00–10:00", site: "Liverpool — hotel", status: "completed" },
];

export function PortalCollectionsMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/bookings"
      caption="Illustrative collections view — recurring route slots, time windows, and self-service amendments per site."
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-foreground">Bookings</p>
          <p className="text-xs text-muted-foreground">Across 3 sites · next collection in 2 days</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
          <Truck className="h-3 w-3" aria-hidden />
          Route confirmed
        </span>
      </header>

      <ol className="space-y-2">
        {COLLECTIONS_SCHEDULE.map((slot) => (
          <li
            key={`${slot.date}-${slot.site}`}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-md border bg-muted/40 text-foreground">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{slot.day}</span>
                <span className="text-xs font-semibold">{slot.date}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{slot.site}</p>
                <p className="text-[11px] text-muted-foreground">{slot.window}</p>
              </div>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium",
                slot.status === "confirmed" &&
                  "border border-primary/30 bg-primary/10 text-primary",
                slot.status === "tentative" &&
                  "border border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-200",
                slot.status === "completed" &&
                  "border border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
              )}
            >
              {slot.status === "confirmed"
                ? "Confirmed"
                : slot.status === "tentative"
                  ? "Tentative — awaiting site"
                  : "Completed"}
            </span>
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each site keeps its own contact, access notes, and time window — so brigades and security know when we&apos;re on the way.
        </p>
      </div>
    </PortalPreviewFrame>
  );
}

const INVOICE_ROWS: {
  number: string;
  site: string;
  total: string;
  status: "issued" | "overdue" | "paid" | "scheduled";
  due: string;
}[] = [
  { number: "INV-2451", site: "Group · April activity", total: "£842.40", status: "issued", due: "Due 18 May" },
  { number: "INV-2438", site: "Manchester — prep", total: "£186.00", status: "overdue", due: "5 days overdue" },
  { number: "INV-2421", site: "Leeds — bistro", total: "£312.00", status: "paid", due: "Paid 02 May" },
  { number: "INV-2407", site: "Subscription · May", total: "£480.00", status: "scheduled", due: "Auto-charge 20 May" },
];

export function PortalInvoicingMarketingPreview() {
  return (
    <PortalPreviewFrame
      path="wesharp.uk/account/invoices"
      caption="Illustrative invoice list — statuses, totals, and downloads in one place; consolidated billing optional for trade accounts."
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-foreground">Invoices</p>
          <p className="text-xs text-muted-foreground">2 awaiting payment · totals in GBP</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["All", "Open", "Paid", "Subscription"].map((label, idx) => (
            <span
              key={label}
              className={cn(
                "rounded-md border px-2 py-0.5 text-[11px] font-medium",
                idx === 0
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-muted/40 text-muted-foreground",
              )}
            >
              {label}
            </span>
          ))}
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Invoice</th>
              <th className="hidden px-3 py-2 font-medium sm:table-cell">Site / billing line</th>
              <th className="px-3 py-2 font-medium text-right">Total</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="hidden px-3 py-2 font-medium md:table-cell">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {INVOICE_ROWS.map((row) => (
              <tr key={row.number} className="bg-background">
                <td className="px-3 py-2 font-mono text-[11px] text-foreground">{row.number}</td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{row.site}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums text-foreground">{row.total}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      row.status === "issued" &&
                        "border border-border/70 bg-muted text-foreground",
                      row.status === "overdue" &&
                        "border border-destructive/40 bg-destructive/10 text-destructive",
                      row.status === "paid" &&
                        "border border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/30 dark:text-emerald-200",
                      row.status === "scheduled" &&
                        "border border-primary/30 bg-primary/10 text-primary",
                    )}
                  >
                    {row.status === "issued"
                      ? "Awaiting payment"
                      : row.status === "overdue"
                        ? "Overdue"
                        : row.status === "paid"
                          ? "Paid"
                          : "Scheduled"}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">{row.due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            VAT-ready PDFs download from the same row — no more digging through inbox attachments.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Card payments are handled by Stripe; bank transfer and consolidated terms agreed during onboarding.
          </p>
        </div>
      </div>
    </PortalPreviewFrame>
  );
}

const QA_HIGHLIGHTS: { icon: typeof CheckCircle2; label: string; detail: string }[] = [
  {
    icon: CheckCircle2,
    label: "Edge geometry",
    detail: "Re-set to spec for each blade type — not a one-pass grind.",
  },
  {
    icon: ShieldCheck,
    label: "Sanitised handling",
    detail: "Logged on receipt and again before return; recorded on your order.",
  },
  {
    icon: ClipboardCheck,
    label: "Kit list reconciled",
    detail: "Every blade checked back against your register before we close the order.",
  },
];

/** Compact QA bullet strip — used as a supporting visual on order/knife pages. */
export function PortalQualityHighlightsStrip() {
  return (
    <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
      {QA_HIGHLIGHTS.map(({ icon: Icon, label, detail }) => (
        <div
          key={label}
          className="rounded-xl border border-border/70 bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className="h-4 w-4 text-primary" aria-hidden />
            {label}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
        </div>
      ))}
    </div>
  );
}
