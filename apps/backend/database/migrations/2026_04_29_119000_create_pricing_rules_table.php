<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_rules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('service_area_id')->nullable()->constrained('service_areas')->nullOnDelete();
            $table->string('name');
            $table->string('service_type', 32)->nullable()->index();
            $table->string('rule_kind');
            $table->integer('priority')->default(0)->index();
            $table->unsignedBigInteger('amount_pence')->nullable();
            $table->json('constraints')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestampsTz();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pricing_rules');
    }
};
