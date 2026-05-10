<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_allocations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('cost_item_id')->nullable()->constrained('cost_items')->nullOnDelete();
            $table->foreignUuid('consumable_usage_id')->nullable()->constrained('consumable_usages')->nullOnDelete();
            $table->string('target_type', 32);
            $table->uuid('target_id');
            $table->unsignedBigInteger('amount_pence');
            $table->string('currency', 3)->default('GBP');
            $table->string('allocation_method', 48);
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['target_type', 'target_id']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_allocations');
    }
};
