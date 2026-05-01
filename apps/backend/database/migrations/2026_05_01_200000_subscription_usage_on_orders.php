<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignUuid('company_subscription_id')
                ->nullable()
                ->after('booking_id')
                ->constrained('company_subscriptions')
                ->nullOnDelete();
            $table->json('subscription_coverage')->nullable()->after('company_subscription_id');
            $table->timestampTz('subscription_coverage_computed_at')->nullable()->after('subscription_coverage');
            $table->boolean('subscription_coverage_overridden')->default(false)->after('subscription_coverage_computed_at');
            $table->text('subscription_coverage_override_reason')->nullable()->after('subscription_coverage_overridden');
        });

        Schema::table('order_items', function (Blueprint $table): void {
            $table->string('subscription_billing_kind', 24)
                ->default('na')
                ->after('service_status');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table): void {
            $table->dropColumn('subscription_billing_kind');
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('company_subscription_id');
            $table->dropColumn([
                'subscription_coverage',
                'subscription_coverage_computed_at',
                'subscription_coverage_overridden',
                'subscription_coverage_override_reason',
            ]);
        });
    }
};
