<?php

namespace App\Actions\Invoices;

use App\Models\Invoice;
use Illuminate\Support\Facades\DB;

final class AllocateInvoiceNumber
{
    public static function generate(): string
    {
        $prefix = 'INV-'.now()->format('Ym').'-';

        return DB::transaction(function () use ($prefix): string {
            for ($n = 1; $n < 1_000_000; ++$n) {
                /** @phpstan-ignore-next-line */
                $candidate = sprintf('%s%06d', $prefix, $n);
                /** @phpstan-ignore-next-line */
                if (! Invoice::query()->where('invoice_number', $candidate)->exists()) {

                    return $candidate;
                }
            }

            abort(503, 'Could not allocate invoice number.');
        });
    }
}
