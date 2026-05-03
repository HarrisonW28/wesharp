<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->timestampTz('terms_accepted_at')->nullable()->after('email_notification_preferences');
            $table->boolean('marketing_opt_in')->default(false)->after('terms_accepted_at');
            $table->timestampTz('marketing_opt_in_at')->nullable()->after('marketing_opt_in');
            $table->string('marketing_opt_in_source', 64)->nullable()->after('marketing_opt_in_at');
        });

        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->timestampTz('stripe_last_payment_failed_at')->nullable()->after('stripe_subscription_id');
        });
    }

    public function down(): void
    {
        Schema::table('company_subscriptions', function (Blueprint $table): void {
            $table->dropColumn('stripe_last_payment_failed_at');
        });

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'terms_accepted_at',
                'marketing_opt_in',
                'marketing_opt_in_at',
                'marketing_opt_in_source',
            ]);
        });
    }
};
