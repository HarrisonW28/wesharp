<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('consumables', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('cost_item_id')->unique()->constrained('cost_items')->cascadeOnDelete();
            $table->decimal('stock_quantity', 14, 3)->default(0);
            $table->string('stock_unit', 64)->nullable();
            $table->decimal('reorder_threshold', 14, 3)->nullable();
            $table->text('reorder_note')->nullable();
            $table->date('last_reorder_date')->nullable();
            $table->decimal('estimated_uses_per_unit', 14, 2)->nullable();
            $table->unsignedBigInteger('cost_per_knife_estimate_pence')->nullable();
            $table->string('status', 32)->default('active');
            $table->timestamps();

            $table->index(['status']);
        });

        Schema::create('consumable_usages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('consumable_id')->constrained('consumables')->cascadeOnDelete();
            $table->date('usage_date');
            $table->decimal('quantity_used', 14, 3);
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignUuid('route_id')->nullable()->constrained('routes')->nullOnDelete();
            $table->foreignUuid('knife_id')->nullable()->constrained('knives')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['consumable_id', 'usage_date']);
            $table->index(['order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consumable_usages');
        Schema::dropIfExists('consumables');
    }
};
