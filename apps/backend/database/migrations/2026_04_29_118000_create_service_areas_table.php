<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_areas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('city')->index();
            $table->string('region')->nullable();
            $table->string('country', 8)->default('GB');
            $table->string('postcode_prefix', 10)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestampsTz();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_areas');
    }
};
