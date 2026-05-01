<?php

declare(strict_types=1);

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
                'company:id,name,city',
                'order:id,booking_id,created_at,order_status',
                'payments:id,invoice_id,amount_pence,payment_status,payment_method,paid_at,reference',
            ]);

        if (($v = trim((string) $request->query('q', ''))) !== '') {
            $needle = '%'.$v.'%';
            $query->where(function ($qq) use ($v, $needle): void {
                $qq->where('invoice_number', 'like', $needle)
                    ->orWhereKey($v)
                    ->orWhereHas('company', fn ($c) => $c->where('name', 'like', $needle));
            });
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $query->where('company_id', $cid);
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $query->where('invoice_status', $st);
        }

        if (($from = trim((string) $request->query('date_from', ''))) !== '') {
            $query->whereDate('issued_on', '>=', $from);
        }

        if (($to = trim((string) $request->query('date_to', ''))) !== '') {
            $query->whereDate('issued_on', '<=', $to);
        }

        if (($request->query('overdue')) === '1' || ($request->query('overdue')) === 'true') {
            $query->whereIn('invoice_status', [InvoiceStatus::Sent->value, InvoiceStatus::Overdue->value])
                ->whereNotNull('due_on')
                ->whereDate('due_on', '<', now()->toDateString());
        }

        $settlement = trim((string) $request->query('settlement', ''));
        if ($settlement === 'unpaid') {
            $query->whereNotIn('invoice_status', [InvoiceStatus::Void->value, InvoiceStatus::Paid->value])
                ->whereRaw(
                    'COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0) < invoices.total_pence'
                );
        } elseif ($settlement === 'partial') {
            $query->whereNotIn('invoice_status', [InvoiceStatus::Void->value, InvoiceStatus::Paid->value])
                ->whereRaw(
                    'COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0) > 0'
                )
                ->whereRaw(
                    'COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0) < invoices.total_pence'
                );
        } elseif ($settlement === 'paid') {
            $query->where(function ($q): void {
                $q->where('invoice_status', InvoiceStatus::Paid->value)
                    ->orWhere(function ($qq): void {
                        $qq->where('invoice_status', '!=', InvoiceStatus::Void->value)
                            ->whereRaw(
                                'COALESCE((SELECT SUM(amount_pence) FROM payments WHERE payments.invoice_id = invoices.id), 0) >= invoices.total_pence'
                            );
                    });
            });
        }

        return $query->orderByDesc('issued_on')->orderByDesc('created_at')->paginate($perPage)->withQueryString();
    }
}
