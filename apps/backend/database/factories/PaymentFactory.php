<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
{
    public function configure(): static
    {
        return $this->afterMaking(function (Payment $payment): void {
            if ($payment->invoice_id) {
                $invoice = Invoice::query()->find($payment->invoice_id);
                if ($invoice !== null) {
                    $payment->company_id = $invoice->company_id;
                }
            }
        });
    }

    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'invoice_id' => Invoice::factory(),
            'order_id' => null,
            'amount_pence' => fake()->numberBetween(1_000, 25_000),
            'payment_status' => fake()->randomElement(PaymentStatus::cases()),
            'payment_method' => fake()->randomElement(PaymentMethod::cases()),
            'currency' => 'GBP',
            'paid_at' => fake()->boolean(65) ? now() : null,
            'due_at' => fake()->boolean(30) ? now()->addDays(14) : null,
            'reference' => fake()->boolean(50) ? 'STRIPE-'.fake()->numerify('####') : null,
        ];
    }
}
