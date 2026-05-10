<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ConsumableInventoryStatus;
use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Models\Consumable;
use App\Models\CostCategory;
use App\Models\CostItem;
use Illuminate\Database\Seeder;

/**
 * Workshop consumables aligned with Sprint 23.4 spreadsheet examples (inventory + unit economics seeds).
 */
final class ConsumableCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categoryId = CostCategory::query()->where('slug', 'consumables_and_spares')->value('id');
        if ($categoryId === null) {
            $this->call(CostCatalogSeeder::class);
            $categoryId = CostCategory::query()->where('slug', 'consumables_and_spares')->value('id');
        }
        $categoryId = (string) $categoryId;

        $defaults = [
            'tier_label' => null,
            'description' => null,
            'currency' => 'GBP',
            'priority' => 0,
            'is_seeded' => true,
            'source' => 'seed',
            'source_sheet' => 'Consumables Tracker',
            'source_row' => null,
            'starts_on' => null,
            'ends_on' => null,
            'next_due_on' => null,
            'created_by_user_id' => null,
            'updated_by_user_id' => null,
        ];

        foreach ($this->consumableDefinitions() as $row) {
            $item = CostItem::query()->updateOrCreate(
                ['seed_key' => $row['seed_key']],
                array_merge($defaults, [
                    'category_id' => $categoryId,
                    'name' => $row['name'],
                    'amount_pence' => $row['amount_pence'],
                    'frequency' => CostFrequency::OneTime,
                    'status' => CostStatus::Active,
                    'supplier_name' => $row['supplier_name'] ?? null,
                    'supplier_url' => null,
                    'notes' => $row['notes'] ?? null,
                    'is_recurring' => false,
                    'is_consumable' => true,
                ]),
            );

            Consumable::query()->updateOrCreate(
                ['cost_item_id' => $item->id],
                [
                    'stock_quantity' => $row['stock_quantity'],
                    'stock_unit' => $row['stock_unit'],
                    'reorder_threshold' => $row['reorder_threshold'],
                    'reorder_note' => $row['reorder_note'] ?? null,
                    'last_reorder_date' => $row['last_reorder_date'] ?? null,
                    'estimated_uses_per_unit' => $row['estimated_uses_per_unit'],
                    'cost_per_knife_estimate_pence' => $row['cost_per_knife_estimate_pence'] ?? null,
                    'status' => ConsumableInventoryStatus::Active,
                ],
            );
        }
    }

    /**
     * Representative unit costs and inventory levels for demo environments.
     *
     * @return list<array{seed_key:string,name:string,amount_pence:int,stock_quantity:float|int,stock_unit:string,reorder_threshold:float|int,reorder_note?:?string,last_reorder_date?:?string,estimated_uses_per_unit:float|int,cost_per_knife_estimate_pence?:?int,supplier_name?:?string,notes?:?string}>
     */
    private function consumableDefinitions(): array
    {
        return [
            [
                'seed_key' => 'consumables.diamond_wheel_coarse',
                'name' => 'Diamond Wheel — Coarse',
                'amount_pence' => 4500,
                'stock_quantity' => 4,
                'stock_unit' => 'wheel',
                'reorder_threshold' => 2,
                'reorder_note' => 'Keep a spare wheel on hand.',
                'estimated_uses_per_unit' => 220,
                'cost_per_knife_estimate_pence' => 20,
                'supplier_name' => 'Tormek',
            ],
            [
                'seed_key' => 'consumables.diamond_wheel_fine',
                'name' => 'Diamond Wheel — Fine',
                'amount_pence' => 4500,
                'stock_quantity' => 4,
                'stock_unit' => 'wheel',
                'reorder_threshold' => 2,
                'estimated_uses_per_unit' => 220,
                'cost_per_knife_estimate_pence' => 20,
                'supplier_name' => 'Tormek',
            ],
            [
                'seed_key' => 'consumables.diamond_wheel_extra_fine',
                'name' => 'Diamond Wheel — Extra Fine',
                'amount_pence' => 5200,
                'stock_quantity' => 3,
                'stock_unit' => 'wheel',
                'reorder_threshold' => 2,
                'estimated_uses_per_unit' => 200,
                'cost_per_knife_estimate_pence' => 26,
                'supplier_name' => 'Tormek',
            ],
            [
                'seed_key' => 'consumables.conical_composite_honing_wheel',
                'name' => 'Conical Composite Honing Wheel',
                'amount_pence' => 8900,
                'stock_quantity' => 2,
                'stock_unit' => 'wheel',
                'reorder_threshold' => 1,
                'estimated_uses_per_unit' => 400,
                'cost_per_knife_estimate_pence' => 22,
                'supplier_name' => 'Tormek',
            ],
            [
                'seed_key' => 'consumables.exchange_clamps',
                'name' => 'Exchange Clamps',
                'amount_pence' => 2800,
                'stock_quantity' => 6,
                'stock_unit' => 'set',
                'reorder_threshold' => 3,
                'estimated_uses_per_unit' => 800,
                'cost_per_knife_estimate_pence' => 4,
            ],
            [
                'seed_key' => 'consumables.knife_protection_pads',
                'name' => 'Knife Protection Pads',
                'amount_pence' => 1200,
                'stock_quantity' => 40,
                'stock_unit' => 'pad',
                'reorder_threshold' => 15,
                'estimated_uses_per_unit' => 1,
                'cost_per_knife_estimate_pence' => 120,
            ],
            [
                'seed_key' => 'consumables.honing_compound',
                'name' => 'Honing Compound',
                'amount_pence' => 950,
                'stock_quantity' => 0.5,
                'stock_unit' => 'tube',
                'reorder_threshold' => 2,
                'reorder_note' => 'Low stock — typical workshop burn.',
                'estimated_uses_per_unit' => 90,
                'cost_per_knife_estimate_pence' => 11,
            ],
            [
                'seed_key' => 'consumables.100k_grit_polish',
                'name' => '100k Grit Polish',
                'amount_pence' => 1850,
                'stock_quantity' => 3,
                'stock_unit' => 'bottle',
                'reorder_threshold' => 2,
                'estimated_uses_per_unit' => 120,
                'cost_per_knife_estimate_pence' => 15,
            ],
            [
                'seed_key' => 'consumables.strop_leather',
                'name' => 'Strop Leather',
                'amount_pence' => 1650,
                'stock_quantity' => 5,
                'stock_unit' => 'strip',
                'reorder_threshold' => 2,
                'estimated_uses_per_unit' => 300,
                'cost_per_knife_estimate_pence' => 6,
            ],
            [
                'seed_key' => 'consumables.cleaning_supplies_workshop',
                'name' => 'Cleaning supplies',
                'amount_pence' => 2200,
                'stock_quantity' => 8,
                'stock_unit' => 'kit',
                'reorder_threshold' => 4,
                'notes' => 'Workshop consumables / restock bundle (distinct from startup cleaning row).',
                'estimated_uses_per_unit' => 50,
                'cost_per_knife_estimate_pence' => 44,
            ],
        ];
    }
}
