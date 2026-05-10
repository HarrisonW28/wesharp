<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Models\CostCategory;
use App\Models\CostItem;
use Illuminate\Database\Seeder;

/**
 * Baseline rows aligned with WeSharp costs workbook “Cost Plan” (Sprint 23.1).
 */
final class CostCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categoriesBySlug = $this->seedCategories();
        foreach ($this->costPlanRows() as $row) {
            CostItem::query()->updateOrCreate(
                ['seed_key' => $row['seed_key']],
                array_merge($this->defaults(), [
                    'category_id' => $categoriesBySlug[$row['category_slug']],
                    'tier_label' => $row['tier_label'] ?? null,
                    'name' => $row['name'],
                    'amount_pence' => $row['amount_pence'],
                    'frequency' => $row['frequency'],
                    'status' => $row['status'],
                    'priority' => $row['priority'] ?? 0,
                    'notes' => $row['notes'] ?? null,
                    'is_recurring' => $row['frequency']->isRecurring(),
                    'is_consumable' => $row['is_consumable'] ?? false,
                ]),
            );
        }
    }

    /**
     * @return array<string, string> slug => category UUID
     */
    private function seedCategories(): array
    {
        $defs = [
            ['Equipment', 'equipment', 'Heavy workshop gear and capital tooling.', 10],
            ['Startup essentials', 'startup_essentials', 'Initial kit-out for collections and workshop.', 20],
            ['Safety and uniform', 'safety_and_uniform', 'PPE and branded clothing.', 30],
            ['Admin and legal', 'admin_and_legal', 'Company formation, domains, and finance admin.', 40],
            ['Software and subscriptions', 'software_and_subscriptions', 'Connectivity and digital tooling.', 50],
            ['Insurance', 'insurance', 'Cover for operations and liability.', 55],
            ['Marketing and sales', 'marketing_and_sales', 'Outbound presence and collateral.', 60],
            ['Route and vehicle', 'route_and_vehicle', 'Fuel and mobility.', 70],
            ['Consumables and spares', 'consumables_and_spares', 'Workshop consumables and replenishment.', 80],
            ['Research and future services', 'research_and_future_services', 'Experiments and roadmap costs.', 90],
            ['Staff and contractors', 'staff_and_contractors', 'People costs not yet allocated.', 100],
            ['Other', 'other', 'Catch-all internal classification.', 110],
        ];

        $map = [];
        foreach ($defs as [$name, $slug, $description, $order]) {
            $cat = CostCategory::query()->updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'description' => $description,
                    'display_order' => $order,
                    'is_active' => true,
                ],
            );
            $map[$slug] = $cat->id;
        }

        return $map;
    }

    /**
     * @return array<string, mixed>
     */
    private function defaults(): array
    {
        return [
            'description' => null,
            'currency' => 'GBP',
            'supplier_name' => null,
            'supplier_url' => null,
            'is_seeded' => true,
            'source' => 'seed',
            'source_sheet' => 'Cost Plan',
            'source_row' => null,
            'starts_on' => null,
            'ends_on' => null,
            'next_due_on' => null,
            'created_by_user_id' => null,
            'updated_by_user_id' => null,
        ];
    }

    /**
     * @return list<array{seed_key:string,category_slug:string,tier_label:?string,name:string,amount_pence:int,frequency:CostFrequency,status:CostStatus,priority?:int,notes?:?string,is_consumable?:bool}>
     */
    private function costPlanRows(): array
    {
        return [
            [
                'seed_key' => 'cost_plan.tormek_t2',
                'category_slug' => 'equipment',
                'tier_label' => null,
                'name' => 'Tormek T-2',
                'amount_pence' => 58597,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.blade_guards',
                'category_slug' => 'startup_essentials',
                'tier_label' => null,
                'name' => 'Blade guards',
                'amount_pence' => 999,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.lockable_crate',
                'category_slug' => 'startup_essentials',
                'tier_label' => null,
                'name' => 'Lockable crate',
                'amount_pence' => 5000,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.knife_rolls',
                'category_slug' => 'startup_essentials',
                'tier_label' => null,
                'name' => 'Knife rolls',
                'amount_pence' => 3400,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.cleaning_supplies_startup',
                'category_slug' => 'startup_essentials',
                'tier_label' => null,
                'name' => 'Cleaning supplies',
                'amount_pence' => 1000,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.insurance_setup_deposit',
                'category_slug' => 'insurance',
                'tier_label' => null,
                'name' => 'Insurance setup/deposit',
                'amount_pence' => 5000,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::PendingQuote,
            ],
            [
                'seed_key' => 'cost_plan.safety_boots',
                'category_slug' => 'safety_and_uniform',
                'tier_label' => null,
                'name' => 'Safety boots',
                'amount_pence' => 4320,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.polo_shirts',
                'category_slug' => 'safety_and_uniform',
                'tier_label' => null,
                'name' => 'Polo shirts',
                'amount_pence' => 6000,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToOrder,
            ],
            [
                'seed_key' => 'cost_plan.business_cards_100',
                'category_slug' => 'marketing_and_sales',
                'tier_label' => null,
                'name' => 'Business cards 100',
                'amount_pence' => 4090,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.business_cards_1000',
                'category_slug' => 'marketing_and_sales',
                'tier_label' => null,
                'name' => 'Business cards 1,000',
                'amount_pence' => 15300,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.loaner_knives',
                'category_slug' => 'startup_essentials',
                'tier_label' => null,
                'name' => 'Loaner knives',
                'amount_pence' => 5280,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Deferred,
            ],
            [
                'seed_key' => 'cost_plan.domain',
                'category_slug' => 'admin_and_legal',
                'tier_label' => null,
                'name' => 'Domain',
                'amount_pence' => 517,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.logo',
                'category_slug' => 'admin_and_legal',
                'tier_label' => null,
                'name' => 'Logo',
                'amount_pence' => 681,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.incorporation',
                'category_slug' => 'admin_and_legal',
                'tier_label' => null,
                'name' => 'Incorporation',
                'amount_pence' => 2499,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::Purchased,
            ],
            [
                'seed_key' => 'cost_plan.mobile_sim',
                'category_slug' => 'software_and_subscriptions',
                'tier_label' => null,
                'name' => 'Mobile SIM',
                'amount_pence' => 1000,
                'frequency' => CostFrequency::Monthly,
                'status' => CostStatus::Active,
            ],
            [
                'seed_key' => 'cost_plan.accounting_estimate',
                'category_slug' => 'admin_and_legal',
                'tier_label' => null,
                'name' => 'Accounting estimate',
                'amount_pence' => 4000,
                'frequency' => CostFrequency::Monthly,
                'status' => CostStatus::ToArrange,
            ],
            [
                'seed_key' => 'cost_plan.insurance_monthly_premium',
                'category_slug' => 'insurance',
                'tier_label' => null,
                'name' => 'Insurance monthly premium',
                'amount_pence' => 4000,
                'frequency' => CostFrequency::Monthly,
                'status' => CostStatus::PendingQuote,
            ],
            [
                'seed_key' => 'cost_plan.petrol',
                'category_slug' => 'route_and_vehicle',
                'tier_label' => null,
                'name' => 'Petrol',
                'amount_pence' => 6000,
                'frequency' => CostFrequency::Weekly,
                'status' => CostStatus::Active,
            ],
            [
                'seed_key' => 'cost_plan.diamond_wheel_replenishment_reserve',
                'category_slug' => 'consumables_and_spares',
                'tier_label' => null,
                'name' => 'Diamond wheel replenishment reserve',
                'amount_pence' => 10000,
                'frequency' => CostFrequency::Monthly,
                'status' => CostStatus::Reserve,
            ],
            [
                'seed_key' => 'cost_plan.serrated_solution_research',
                'category_slug' => 'research_and_future_services',
                'tier_label' => null,
                'name' => 'Serrated knife sharpening solution',
                'amount_pence' => 0,
                'frequency' => CostFrequency::OneTime,
                'status' => CostStatus::ToResearch,
                'notes' => 'Placeholder research row for future serrated service.',
            ],
        ];
    }
}
