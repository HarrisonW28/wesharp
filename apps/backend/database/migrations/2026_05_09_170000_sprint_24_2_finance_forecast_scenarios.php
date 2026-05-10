<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('finance_forecast_scenarios', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('scenario_type', 32)->index();
            $table->json('inputs');
            $table->string('preset_key')->nullable()->unique();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('finance_forecast_scenarios');
    }
};
