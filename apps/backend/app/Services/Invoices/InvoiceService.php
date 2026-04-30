<?php

namespace App\Services\Invoices;

use App\Enums\InvoiceStatus;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

final class InvoiceService
{
    public function paginate(Request $request): LengthAwarePaginator
    {
        /** @phpstan-ignore-next-line */
        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));

        $query = Invoice::query()
            ->with([
                'company:id,name',
                'order:id,booking_id',
                'payments:id,invoice_id,amount_pence',
            ]);

        if (($v = trim((string) $request->query('q', ''))) !== '') {
            $query->where(function ($qq) use ($v): void {
                $qq->where('invoice_number', 'like', '%'.$v.'%')
                    ->orWhereHas('order', fn ($oq) => $oq->whereKey($v))
                    ->orWhereKey($v);
            });
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $query->where('company_id', $cid);
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $query->where('invoice_status', $st);
        }

        if (($request->query('overdue')) === '1' || ($request->query('overdue')) === 'true') {
            $query->whereIn('invoice_status', [InvoiceStatus::Sent->value, InvoiceStatus::Overdue->value])
                ->whereNotNull('due_on')
                ->whereDate('due_on', '<', now()->toDateString());
        }

        return $query->orderByDesc('issued_on')->paginate($perPage)->withQueryString();
    }
}
