<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Sprint 10.7 — tracked billing periods per subscription row, operational-slot partial unique (active + past_due).
 * Runs after subscription_data_model so company_subscriptions.deleted_at exists.
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement('DROP INDEX IF EXISTS company_subscriptions_one_active_per_company');
        }

        Schema::create('subscription_billing_periods', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_subscription_id')
                ->constrained('company_subscriptions')
                ->cascadeOnDelete();
            $table->unsignedInteger('period_index');
            $table->date('starts_on');
            $table->date('ends_on');
            $table->timestampTz('closed_at')->nullable();
            $table->uuid('superseded_by_period_id')->nullable();
            $table->timestampsTz();
            $table->unique(['company_subscription_id', 'period_index'], 'sub_billing_periods_sub_idx_unique');
            $table->unique(['company_subscription_id', 'starts_on', 'ends_on'], 'sub_billing_periods_window_unique');
            $table->index(['company_subscription_id', 'closed_at']);
        });

        Schema::table('subscription_billing_periods', function (Blueprint $table): void {
            $table->foreign('superseded_by_period_id')
                ->references('id')
                ->on('subscription_billing_periods')
                ->nullOnDelete();
        });

        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement("CREATE UNIQUE INDEX company_subscriptions_one_operational_slot ON company_subscriptions (company_id) WHERE status IN ('active', 'past_due') AND deleted_at IS NULL");
        }

        $subs = DB::table('company_subscriptions')
            ->whereNull('deleted_at')
            ->whereNotNull('starts_at')
            ->whereNotNull('renews_at')
            ->orderBy('created_at')
            ->get(['id', 'starts_at', 'renews_at']);

        $now = now();
        foreach ($subs as $row) {
            DB::table('subscription_billing_periods')->insert([
                'id' => (string) Str::uuid(),
                'company_subscription_id' => $row->id,
                'period_index' => 1,
                'starts_on' => $row->starts_at,
                'ends_on' => $row->renews_at,
                'closed_at' => null,
                'superseded_by_period_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement('DROP INDEX IF EXISTS company_subscriptions_one_operational_slot');
        }

        Schema::dropIfExists('subscription_billing_periods');

        if (in_array($driver, ['sqlite', 'pgsql'], true)) {
            DB::statement("CREATE UNIQUE INDEX company_subscriptions_one_active_per_company ON company_subscriptions (company_id) WHERE status = 'active' AND deleted_at IS NULL");
        }
    }
};
