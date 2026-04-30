<?php

namespace App\Services\Payments;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;

final class PaymentService
{
    public function paginate(Request $request): LengthAwarePaginator
    {
        /** @phpstan-ignore-next-line */
        $perPage = min(75, max(1, (int) $request->query('per_page', 25)));

        $query = Payment::query()
            ->with([
                'company:id,name',
                'invoice:id,invoice_number,company_id',
                'order:id,booking_id',
            ]);

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $query->where('company_id', $cid);
        }

        if (($iid = trim((string) $request->query('invoice_id', ''))) !== '') {
            $query->where('invoice_id', $iid);
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $query->where('payment_status', $st);
        }

        return $query->orderByDesc('paid_at')->orderByDesc('created_at')->paginate($perPage)->withQueryString();
    }
}
