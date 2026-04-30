<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->nullable();
            $table->string('route_status', 32)->index();
            $table->date('scheduled_date')->nullable()->index();
            $table->foreignId('driver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestampsTz();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('routes');
    }
};
