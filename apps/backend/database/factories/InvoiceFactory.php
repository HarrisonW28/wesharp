<?php

namespace Database\Factories;

use App\Enums\InvoiceSourceType;
use App\Enums\InvoiceStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Order;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Invoice>
 */
class InvoiceFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (Invoice $invoice): void {
            if ($invoice->order_id) {
                $order = Order::query()->find($invoice->order_id);
                if ($order !== null) {
                    $invoice->company_id = $order->company_id;
                }
                if ($invoice->source_type === null && $invoice->source_id === null) {
                    $invoice->source_type = InvoiceSourceType::Order->value;
                    $invoice->source_id = $invoice->order_id;
                }
            }
        });
    }

    public function definition(): array
    {
        $subtotal = fake()->numberBetween(2_000, 22_000);
        $tax = (int) round($subtotal * 0.2);

        return [
            'company_id' => Company::factory(),
            'order_id' => Order::factory(),
            'invoice_number' => 'INV-'.fake()->unique()->numerify('######'),
            'invoice_status' => fake()->randomElement(InvoiceStatus::cases()),
            'issued_on' => now()->toDateString(),
            'due_on' => now()->addDays(14)->toDateString(),
            'subtotal_pence' => $subtotal,
            'tax_pence' => $tax,
            'total_pence' => $subtotal + $tax,
            'currency' => 'GBP',
        ];
    }
}
