import { cn } from "@/lib/utils";
import { formatGBP } from "@/lib/format/money";
import { invoiceLineTypeLabel } from "@/lib/format/invoice-line";

export type InvoiceIssuerBlock = {
  legal_name: string;
  address_lines: string[];
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
};

export type InvoiceBillToBlock = {
  name: string;
  city?: string | null;
  billing_email?: string | null;
  phone?: string | null;
};

export type InvoiceDocumentLine = {
  description: string;
  quantity: number;
  unitFormatted: string;
  lineFormatted: string;
  kind?: string | null;
};

export type InvoiceDocumentProps = {
  className?: string;
  /** Document heading, e.g. "Invoice INV-123" or friendly reference */
  documentTitle: string;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  statusLabel: string;
  paymentStatusLabel?: string | null;
  issuer: InvoiceIssuerBlock;
  billTo: InvoiceBillToBlock | null;
  lines: InvoiceDocumentLine[];
  /** Admin: show service/subscription line type column */
  showLineKinds?: boolean;
  subtotalPence: number;
  taxPence: number;
  totalPence: number;
  paidPence: number;
  outstandingPence: number;
  currencyLabel?: string;
  customerNotes?: string | null;
  defaultPaymentFooter?: string | null;
  /** Shown only on staff copies; never pass from customer API */
  internalNotes?: string | null;
};

function formatStatusLabel(raw: string): string {
  const s = raw.trim();
  if (s === "") return "—";
  return s.replace(/_/g, " ");
}

export function InvoiceDocument({
  className,
  documentTitle,
  invoiceNumber,
  issueDate,
  dueDate,
  statusLabel,
  paymentStatusLabel,
  issuer,
  billTo,
  lines,
  showLineKinds = false,
  subtotalPence,
  taxPence,
  totalPence,
  paidPence,
  outstandingPence,
  currencyLabel = "GBP",
  customerNotes,
  defaultPaymentFooter,
  internalNotes,
}: InvoiceDocumentProps) {
  const cnFoot = customerNotes?.trim() ?? "";
  const dfFoot = defaultPaymentFooter?.trim() ?? "";
  const inFoot = internalNotes?.trim() ?? "";

  return (
    <article
      className={cn(
        "invoice-document text-[15px] leading-relaxed text-foreground print:text-black",
        "print-optimized-invoice",
        className,
      )}
    >
      <header className="flex flex-col gap-8 border-b border-border pb-8 print:border-neutral-300 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-neutral-600">From</div>
          <div className="text-lg font-semibold tracking-tight">{issuer.legal_name}</div>
          {issuer.address_lines.length > 0 ? (
            <address className="not-italic text-sm text-muted-foreground print:text-neutral-700">
              {issuer.address_lines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : null}
          <div className="space-y-0.5 text-sm text-muted-foreground print:text-neutral-700">
            {issuer.email ? <div>{issuer.email}</div> : null}
            {issuer.phone ? <div>{issuer.phone}</div> : null}
            {issuer.vat_number ? <div className="tabular-nums">VAT {issuer.vat_number}</div> : null}
          </div>
        </div>

        <div className="max-w-md space-y-1 md:text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-neutral-600">Bill to</div>
          {billTo ? (
            <>
              <div className="text-lg font-semibold tracking-tight md:ml-auto">{billTo.name}</div>
              <div className="space-y-0.5 text-sm text-muted-foreground print:text-neutral-700 md:ml-auto">
                {billTo.city ? <div>{billTo.city}</div> : null}
                {billTo.billing_email ? <div>{billTo.billing_email}</div> : null}
                {billTo.phone ? <div>{billTo.phone}</div> : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </div>
      </header>

      <div className="mt-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground print:text-black md:text-3xl">{documentTitle}</h1>
        {invoiceNumber ? (
          <p className="mt-1 text-sm text-muted-foreground print:text-neutral-600">
            Invoice number <span className="font-medium tabular-nums text-foreground print:text-black">{invoiceNumber}</span>
          </p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground print:text-neutral-600">All amounts in {currencyLabel}.</p>

        <dl className="mt-6 grid gap-4 border-b border-border pb-6 print:border-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-neutral-600">Status</dt>
            <dd className="mt-1 font-semibold capitalize">{formatStatusLabel(statusLabel)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-neutral-600">Issue date</dt>
            <dd className="mt-1 font-semibold tabular-nums">{issueDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-neutral-600">Due date</dt>
            <dd className="mt-1 font-semibold tabular-nums">{dueDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground print:text-neutral-600">Payment</dt>
            <dd className="mt-1 font-semibold capitalize">{paymentStatusLabel ? formatStatusLabel(paymentStatusLabel) : "—"}</dd>
          </div>
        </dl>
      </div>

      <section className="mt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-neutral-600">Line items</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border print:rounded-none print:border-neutral-300">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground print:border-neutral-300 print:bg-neutral-100 print:text-neutral-700">
                {showLineKinds ? <th className="px-3 py-2 font-medium">Type</th> : null}
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 text-right font-medium">Qty</th>
                <th className="px-3 py-2 text-right font-medium">{showLineKinds ? "Unit (ex VAT)" : "Unit"}</th>
                <th className="px-3 py-2 text-right font-medium">{showLineKinds ? "Line (ex VAT)" : "Line"}</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={showLineKinds ? 5 : 4}
                    className="px-3 py-6 text-center text-muted-foreground print:text-neutral-600"
                  >
                    No lines on this invoice.
                  </td>
                </tr>
              ) : (
                lines.map((line, idx) => (
                  <tr key={`${idx}-${line.description.slice(0, 48)}`} className="border-t border-border print:border-neutral-200">
                    {showLineKinds ? (
                      <td className="px-3 py-2.5 text-muted-foreground print:text-neutral-700">{invoiceLineTypeLabel(line.kind)}</td>
                    ) : null}
                    <td className="px-3 py-2.5 font-medium">{line.description}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{line.quantity}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground print:text-neutral-800">{line.unitFormatted}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium">{line.lineFormatted}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 flex flex-col items-stretch gap-6 sm:items-end">
        <dl className="w-full max-w-sm space-y-2 border-t border-border pt-4 text-sm print:border-neutral-300 sm:border-0 sm:pt-0">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground print:text-neutral-700">Subtotal (ex VAT)</dt>
            <dd className="tabular-nums font-medium">{formatGBP(subtotalPence)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground print:text-neutral-700">VAT</dt>
            <dd className="tabular-nums font-medium">{formatGBP(taxPence)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-border pt-2 text-base font-bold print:border-neutral-300">
            <dt>Total ({currencyLabel})</dt>
            <dd className="tabular-nums">{formatGBP(totalPence)}</dd>
          </div>
          <div className="flex justify-between gap-6 text-muted-foreground print:text-neutral-700">
            <dt>Paid to date</dt>
            <dd className="tabular-nums font-medium text-emerald-700 dark:text-emerald-400 print:text-neutral-900">{formatGBP(paidPence)}</dd>
          </div>
          <div className="flex justify-between gap-6 text-base font-semibold">
            <dt>Outstanding</dt>
            <dd className="tabular-nums">{formatGBP(outstandingPence)}</dd>
          </div>
        </dl>
      </section>

      {(cnFoot !== "" || dfFoot !== "") && (
        <section className="mt-10 border-t border-border pt-6 print:border-neutral-300">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground print:text-neutral-600">Notes &amp; payment</h2>
          {cnFoot !== "" ? (
            <div className="mt-3 whitespace-pre-wrap text-sm text-foreground print:text-black">{customerNotes}</div>
          ) : null}
          {dfFoot !== "" ? (
            <div
              className={cn(
                "mt-3 whitespace-pre-wrap text-sm text-muted-foreground print:text-neutral-800",
                cnFoot !== "" && "border-t border-border pt-4 print:border-neutral-200",
              )}
            >
              {defaultPaymentFooter}
            </div>
          ) : null}
        </section>
      )}

      {inFoot !== "" && (
        <section className="mt-8 rounded-lg border border-amber-200/80 bg-amber-50/80 p-4 text-sm dark:border-amber-900/50 dark:bg-amber-950/30 print:border-amber-300 print:bg-amber-50">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">Internal (not shown to customer)</h2>
          <p className="mt-2 whitespace-pre-wrap text-amber-950 dark:text-amber-100">{internalNotes}</p>
        </section>
      )}

      <footer className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground print:border-neutral-300 print:text-neutral-600">
        Thank you for your business.
      </footer>
    </article>
  );
}
