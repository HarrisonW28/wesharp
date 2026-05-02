<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_area_waitlist_signups', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('email');
            $table->string('postcode', 24);
            $table->string('postcode_normalized', 16)->index();
            $table->string('customer_type', 32);
            $table->unsignedInteger('estimated_knife_count')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_area_waitlist_signups');
    }
};
