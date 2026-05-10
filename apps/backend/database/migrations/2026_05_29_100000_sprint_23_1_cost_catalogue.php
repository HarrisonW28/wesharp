<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_categories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('cost_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('category_id')->constrained('cost_categories')->cascadeOnDelete();
            $table->string('tier_label')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('amount_pence')->default(0);
            $table->char('currency', 3)->default('GBP');
            $table->string('frequency', 32);
            $table->string('status', 32);
            $table->string('supplier_name')->nullable();
            $table->string('supplier_url', 2048)->nullable();
            $table->smallInteger('priority')->default(0);
            $table->text('notes')->nullable();
            $table->boolean('is_recurring')->default(false);
            $table->boolean('is_consumable')->default(false);
            $table->boolean('is_seeded')->default(false);
            $table->string('source', 64)->default('manual');
            $table->string('source_sheet')->nullable();
            $table->unsignedInteger('source_row')->nullable();
            $table->string('seed_key')->nullable()->unique();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->date('next_due_on')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['status', 'frequency']);
            $table->index(['category_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_items');
        Schema::dropIfExists('cost_categories');
    }
};
