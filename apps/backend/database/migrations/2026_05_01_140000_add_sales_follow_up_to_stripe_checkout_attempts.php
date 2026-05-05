<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stripe_checkout_attempts', function (Blueprint $table): void {
            $table->timestampTz('sales_follow_up_dispatched_at')->nullable()->after('expired_at');
        });
    }

    public function down(): void
    {
        Schema::table('stripe_checkout_attempts', function (Blueprint $table): void {
            $table->dropColumn('sales_follow_up_dispatched_at');
        });
    }
};
