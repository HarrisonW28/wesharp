<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use App\Services\Notifications\InvoiceEmailService;
use App\Support\Invoices\InvoiceRollup;
use Illuminate\Console\Command;

final class SendInvoiceDueSoonRemindersCommand extends Command
{
    protected $signature = 'invoices:send-due-soon-reminders';

    protected $description = 'Queue customer-facing “invoice due soon” emails (Sent invoices only; not past due).';

    public function handle(InvoiceEmailService $invoiceEmails): int
    {
        $days = max(1, (int) config('wesharp.invoice_due_soon_days', 3));
        $targetYmd = now()->addDays($days)->toDateString();

        $count = 0;

        Invoice::query()
            ->where('invoice_status', InvoiceStatus::Sent->value)
            ->whereDate('due_on', $targetYmd)
            ->orderBy('id')
            ->chunkById(100, function ($invoices) use ($invoiceEmails, &$count): void {
                foreach ($invoices as $invoice) {
                    if (! $invoice instanceof Invoice) {
                        continue;
                    }
                    $invoice->loadMissing(['payments']);
                    if (InvoiceRollup::isPastDue($invoice)) {
                        continue;
                    }
                    $invoiceEmails->sendInvoiceDueSoon($invoice);
                    $count++;
                }
            });

        $this->info("Queued due-soon reminders for {$count} invoice(s) (due in {$days} day(s)).");

        return self::SUCCESS;
    }
}
