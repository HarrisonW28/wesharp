<?php

declare(strict_types=1);

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Sprint 9.1 — subscription plans, company subscription history, price snapshots,
 * one active subscription per company (partial unique index on sqlite/pgsql).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_plans', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('billing_interval', 32);
            $table->unsignedBigInteger('price_amount_minor');
            $table->char('currency', 3)->default('GBP');
            $table->unsignedInteger('included_collections')->nullable();
            $table->unsignedInteger('included_knife_allowance')->nullable();
            $table->unsignedBigInteger('overage_price_amount_minor')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestampsTz();
            $table->softDeletesTz();
            $table->index(['is_active', 'sort_order']);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->uuid('subscription_plan_id')->nullable()->after('company_id');
            $table->date('starts_at')->nullable()->after('status');
            $table->date('renews_at')->nullable()->after('starts_at');
            $table->timestampTz('cancelled_at')->nullable()->after('renews_at');
            $table->uuid('billing_contact_id')->nullable()->after('cancelled_at');
            $table->unsignedBigInteger('price_amount_minor_snapshot')->nullable()->after('billing_contact_id');
            $table->char('currency', 3)->default('GBP')->after('price_amount_minor_snapshot');
            $table->text('notes')->nullable()->after('currency');
            $table->softDeletesTz();
        });

        $legacyPlanId = (string) Str::uuid();
        $now = now();

        DB::table('subscription_plans')->insert([
            'id' => $legacyPlanId,
            'name' => 'Legacy (pre-Sprint 9.1)',
            'description' => 'Migrated placeholder plan for existing company_subscriptions rows.',
            'billing_interval' => 'monthly',
            'price_amount_minor' => 0,
            'currency' => 'GBP',
            'included_collections' => null,
            'included_knife_allowance' => null,
            'overage_price_amount_minor' => null,
            'is_active' => false,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
            'deleted_at' => null,
        ]);

        $rows = DB::table('company_subscriptions')->orderBy('created_at')->get();
        foreach ($rows as $row) {
            $notesParts = array_filter([
                $row->included_services ?? null,
                $row->allowance_summary ?? null,
            ], static fn ($v) => $v !== null && $v !== '');
            $notes = $notesParts !== [] ? implode("\n\n", $notesParts) : null;

            DB::table('company_subscriptions')->where('id', $row->id)->update([
                'subscription_plan_id' => $legacyPlanId,
                'starts_at' => $row->created_at !== null
                    ? Carbon::parse((string) $row->created_at)->toDateString()
                    : $now->toDateString(),
                'renews_at' => $row->current_period_end,
                'cancelled_at' => ($row->status ?? '') === 'cancelled' ? $row->updated_at : null,
                'billing_contact_id' => null,
                'price_amount_minor_snapshot' => 0,
                'currency' => 'GBP',
                'notes' => $notes,
            ]);
        }

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropUnique(['company_id']);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropIndex(['current_period_end']);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropColumn([
                'plan_name',
                'current_period_end',
                'included_services',
                'allowance_summary',
            ]);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->foreign('subscription_plan_id')
                ->references('id')
                ->on('subscription_plans')
                ->restrictOnDelete();
            $table->foreign('billing_contact_id')
                ->references('id')
                ->on('contacts')
                ->nullOnDelete();
            $table->index(['company_id', 'status']);
        });

        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement("CREATE UNIQUE INDEX company_subscriptions_one_active_per_company ON company_subscriptions (company_id) WHERE status = 'active' AND deleted_at IS NULL");
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();
        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement('DROP INDEX IF EXISTS company_subscriptions_one_active_per_company');
        }

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropForeign(['subscription_plan_id']);
            $table->dropForeign(['billing_contact_id']);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->string('plan_name')->default('Plan');
            $table->date('current_period_end')->nullable();
            $table->text('included_services')->nullable();
            $table->text('allowance_summary')->nullable();
        });

        $planNames = DB::table('subscription_plans')
            ->pluck('name', 'id');

        $subs = DB::table('company_subscriptions')->get();
        foreach ($subs as $sub) {
            $planName = $planNames[$sub->subscription_plan_id] ?? 'Plan';
            DB::table('company_subscriptions')->where('id', $sub->id)->update([
                'plan_name' => $planName,
                'current_period_end' => $sub->renews_at,
                'included_services' => null,
                'allowance_summary' => $sub->notes,
            ]);
        }

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropSoftDeletes();
            $table->dropColumn([
                'subscription_plan_id',
                'starts_at',
                'renews_at',
                'cancelled_at',
                'billing_contact_id',
                'price_amount_minor_snapshot',
                'currency',
                'notes',
            ]);
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->unique('company_id');
        });

        Schema::dropIfExists('subscription_plans');
    }
};
