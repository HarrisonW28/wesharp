<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->string('label')->nullable();
            $table->string('line_one');
            $table->string('line_two')->nullable();
            $table->string('city')->index();
            $table->string('postcode', 24)->nullable();
            $table->string('country', 8)->default('GB');
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestampsTz();
            $table->index(['company_id', 'city']);
            $table->index('company_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_locations');
    }
};
