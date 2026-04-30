<?php

namespace Database\Factories;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InvoiceItem>
 */
class InvoiceItemFactory extends Factory
{
    public function definition(): array
    {
        $qty = fake()->numberBetween(1, 10);
        $unit = fake()->numberBetween(500, 3_000);

        return [
            'invoice_id' => Invoice::factory(),
            'description' => fake()->sentence(3),
            'quantity' => $qty,
            'unit_amount_pence' => $unit,
            'line_total_pence' => $qty * $unit,
        ];
    }
}
