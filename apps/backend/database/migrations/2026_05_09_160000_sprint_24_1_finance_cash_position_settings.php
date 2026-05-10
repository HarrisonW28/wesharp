<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_cash_position_settings', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('starting_capital_pence')->nullable();
            $table->unsignedBigInteger('regular_route_price_per_knife_pence')->nullable();
            $table->unsignedBigInteger('trial_price_per_knife_pence')->nullable();
            $table->decimal('route_days_per_week', 5, 2)->nullable();
            $table->unsignedBigInteger('buffer_warning_threshold_pence')->nullable();
            $table->unsignedBigInteger('conversion_target_price_pence')->nullable();
            $table->unsignedBigInteger('second_machine_trigger_pence')->nullable();
            $table->unsignedBigInteger('van_assessment_trigger_pence')->nullable();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_cash_position_settings');
    }
};
