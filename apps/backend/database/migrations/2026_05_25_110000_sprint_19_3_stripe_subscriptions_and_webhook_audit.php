<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table): void {
            $table->string('stripe_price_id', 255)->nullable()->after('recommended');
            $table->index('stripe_price_id');
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->string('stripe_subscription_id', 255)->nullable()->after('notes');
            $table->unique(['stripe_subscription_id']);
        });

        Schema::table('stripe_webhook_events', function (Blueprint $table): void {
            $table->text('last_error')->nullable()->after('processing_state');
        });
    }

    public function down(): void
    {
        Schema::table('stripe_webhook_events', function (Blueprint $table): void {
            $table->dropColumn('last_error');
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropUnique(['stripe_subscription_id']);
            $table->dropColumn('stripe_subscription_id');
        });

        Schema::table('subscription_plans', function (Blueprint $table): void {
            $table->dropIndex(['stripe_price_id']);
            $table->dropColumn('stripe_price_id');
        });
    }
};
