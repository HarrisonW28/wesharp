<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stripe_subscription_checkout_attempts', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignUuid('subscription_plan_id')->constrained('subscription_plans')->cascadeOnDelete();
            $table->string('stripe_checkout_session_id', 255);
            $table->string('status', 32);
            $table->unsignedInteger('amount_pence');
            $table->string('currency', 3)->default('GBP');
            $table->string('customer_email', 255)->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('expired_at')->nullable();
            $table->timestampTz('follow_up_dispatched_at')->nullable();
            $table->timestampsTz();

            $table->unique('stripe_checkout_session_id');
            $table->index(['company_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_subscription_checkout_attempts');
    }
};
