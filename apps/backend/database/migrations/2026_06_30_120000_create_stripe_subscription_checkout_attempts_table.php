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
            $table->uuid('company_id');
            $table->uuid('subscription_plan_id');
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

            $table->foreign('company_id', 'sub_checkout_attempts_company_fk')
                ->references('id')
                ->on('companies')
                ->cascadeOnDelete();
            $table->foreign('subscription_plan_id', 'sub_checkout_attempts_plan_fk')
                ->references('id')
                ->on('subscription_plans')
                ->cascadeOnDelete();

            $table->unique('stripe_checkout_session_id', 'sub_checkout_attempts_session_uq');
            $table->index(['company_id', 'status'], 'sub_checkout_attempts_co_status_idx');
            $table->index(['status', 'created_at'], 'sub_checkout_attempts_status_created_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stripe_subscription_checkout_attempts');
    }
};
