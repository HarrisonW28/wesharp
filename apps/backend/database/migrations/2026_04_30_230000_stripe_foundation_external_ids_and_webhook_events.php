<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('companies', function (Blueprint $table): void {
            $table->string('stripe_customer_id', 255)->nullable()->after('city');
            $table->index('stripe_customer_id');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->string('stripe_checkout_session_id', 255)->nullable()->after('is_subscription_billing');
            $table->string('stripe_payment_intent_id', 255)->nullable();
            $table->index('stripe_checkout_session_id');
            $table->index('stripe_payment_intent_id');
        });

        Schema::table('payments', function (Blueprint $table): void {
            $table->string('stripe_checkout_session_id', 255)->nullable()->after('external_provider_id');
            $table->string('stripe_payment_intent_id', 255)->nullable();
            $table->index('stripe_checkout_session_id');
            $table->index('stripe_payment_intent_id');
        });

        Schema::create('stripe_webhook_events', function (Blueprint $table): void {
            $table->string('id', 255)->primary();
            $table->string('type', 128)->index();
            $table->timestampTz('received_at');
            $table->timestampTz('processed_at')->nullable();
            $table->string('processing_state', 32)->default('received')->index();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_webhook_events');

        Schema::table('payments', function (Blueprint $table): void {
            $table->dropIndex(['stripe_checkout_session_id']);
            $table->dropIndex(['stripe_payment_intent_id']);
            $table->dropColumn(['stripe_checkout_session_id', 'stripe_payment_intent_id']);
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex(['stripe_checkout_session_id']);
            $table->dropIndex(['stripe_payment_intent_id']);
            $table->dropColumn(['stripe_checkout_session_id', 'stripe_payment_intent_id']);
        });

        Schema::table('companies', function (Blueprint $table): void {
            $table->dropIndex(['stripe_customer_id']);
            $table->dropColumn('stripe_customer_id');
        });
    }
};
