<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Idempotent for production DBs where subscription columns were applied outside this migration
     * or the migration batch log does not match the live schema.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('orders', 'company_subscription_id')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->foreignUuid('company_subscription_id')
                    ->nullable()
                    ->after('booking_id')
                    ->constrained('company_subscriptions')
                    ->nullOnDelete();
            });
        }

        if (! Schema::hasColumn('orders', 'subscription_coverage')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->json('subscription_coverage')->nullable();
            });
        }

        if (! Schema::hasColumn('orders', 'subscription_coverage_computed_at')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->timestampTz('subscription_coverage_computed_at')->nullable();
            });
        }

        if (! Schema::hasColumn('orders', 'subscription_coverage_overridden')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->boolean('subscription_coverage_overridden')->default(false);
            });
        }

        if (! Schema::hasColumn('orders', 'subscription_coverage_override_reason')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->text('subscription_coverage_override_reason')->nullable();
            });
        }

        if (! Schema::hasColumn('order_items', 'subscription_billing_kind')) {
            // `service_status` is added in 2026_05_08_160000, which runs after this migration; anchor must exist on all DBs.
            $after = Schema::hasColumn('order_items', 'service_status') ? 'service_status' : 'unit_amount_pence';
            Schema::table('order_items', function (Blueprint $table) use ($after): void {
                $table->string('subscription_billing_kind', 24)
                    ->default('na')
                    ->after($after);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_items', 'subscription_billing_kind')) {
            Schema::table('order_items', function (Blueprint $table): void {
                $table->dropColumn('subscription_billing_kind');
            });
        }

        if (Schema::hasColumn('orders', 'company_subscription_id')) {
            Schema::table('orders', function (Blueprint $table): void {
                $table->dropConstrainedForeignId('company_subscription_id');
            });
        }

        $orderDrops = array_values(array_filter([
            Schema::hasColumn('orders', 'subscription_coverage') ? 'subscription_coverage' : null,
            Schema::hasColumn('orders', 'subscription_coverage_computed_at') ? 'subscription_coverage_computed_at' : null,
            Schema::hasColumn('orders', 'subscription_coverage_overridden') ? 'subscription_coverage_overridden' : null,
            Schema::hasColumn('orders', 'subscription_coverage_override_reason') ? 'subscription_coverage_override_reason' : null,
        ], static fn (?string $c): bool => $c !== null));

        if ($orderDrops !== []) {
            Schema::table('orders', function (Blueprint $table) use ($orderDrops): void {
                $table->dropColumn($orderDrops);
            });
        }
    }
};
