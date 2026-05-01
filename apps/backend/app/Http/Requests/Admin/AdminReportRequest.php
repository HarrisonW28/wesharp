<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Data\Reports\AdminReportFilters;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Http\FormRequest;

final class AdminReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'area' => ['sometimes', 'nullable', 'string', 'max:120'],
            'company_id' => ['sometimes', 'nullable', 'uuid'],
            'booking_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'order_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'invoice_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'payment_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'route_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'failure_reason' => ['sometimes', 'nullable', 'string', 'max:512'],
            'knife_status' => ['sometimes', 'nullable', 'string', 'max:64'],
            'knife_type' => ['sometimes', 'nullable', 'string', 'max:96'],
            'service_type' => ['sometimes', 'nullable', 'string', 'max:32'],
            'route_id' => ['sometimes', 'nullable', 'uuid'],
            'driver_user_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'bookings_page' => ['sometimes', 'integer', 'min:1'],
            'orders_page' => ['sometimes', 'integer', 'min:1'],
        ];
    }

    public function filters(): AdminReportFilters
    {
        /** @var array<string, mixed> $v */
        $v = $this->validated();

        /** @phpstan-ignore-next-line */
        $to = isset($v['date_to'])
            ? Carbon::parse((string) $v['date_to'], 'UTC')->endOfDay()
            : Carbon::now('UTC')->endOfDay();

        /** @phpstan-ignore-next-line */
        $from = isset($v['date_from'])
            ? Carbon::parse((string) $v['date_from'], 'UTC')->startOfDay()
            : (clone $to)->utc()->startOfDay()->subDays(90);

        /** @phpstan-ignore-next-line */
        if ($from->gt($to)) {
            /** @phpstan-ignore-next-line */
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $city = isset($v['city']) && is_string($v['city']) && $v['city'] !== '' ? $v['city'] : null;
        $area = isset($v['area']) && is_string($v['area']) && $v['area'] !== '' ? $v['area'] : null;
        $companyId = isset($v['company_id']) && is_string($v['company_id']) ? $v['company_id'] : null;

        $s = static function (?string $key) use ($v): ?string {
            if (! isset($v[$key]) || ! is_string($v[$key]) || $v[$key] === '') {
                return null;
            }

            return $v[$key];
        };

        $routeId = isset($v['route_id']) && is_string($v['route_id']) ? $v['route_id'] : null;
        $driverUserId = isset($v['driver_user_id']) ? (int) $v['driver_user_id'] : null;
        if ($driverUserId !== null && $driverUserId < 1) {
            $driverUserId = null;
        }

        $perPage = isset($v['per_page']) ? (int) $v['per_page'] : 25;
        $perPage = max(1, min(100, $perPage));
        $page = isset($v['page']) ? (int) $v['page'] : 1;
        $page = max(1, $page);

        $bookingsPage = isset($v['bookings_page']) ? max(1, (int) $v['bookings_page']) : null;
        $ordersPage = isset($v['orders_page']) ? max(1, (int) $v['orders_page']) : null;

        return new AdminReportFilters(
            $from,
            $to,
            $city,
            $area,
            $companyId,
            $s('booking_status'),
            $s('order_status'),
            $s('invoice_status'),
            $s('payment_status'),
            $s('route_status'),
            $s('failure_reason'),
            $s('knife_status'),
            $s('knife_type'),
            $s('service_type'),
            $routeId,
            $driverUserId,
            $perPage,
            $page,
            $bookingsPage,
            $ordersPage,
        );
    }
}
