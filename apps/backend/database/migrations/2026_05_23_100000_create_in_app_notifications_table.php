<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('in_app_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('audience', 16)->index(); // staff | customer
            $table->string('kind', 120)->index();
            $table->string('title');
            $table->string('body', 2000)->nullable();
            $table->string('path', 500)->nullable();
            $table->string('dedupe_key', 160)->nullable();
            $table->timestampTz('read_at')->nullable()->index();
            $table->timestampsTz();

            $table->index(['user_id', 'created_at']);
            $table->unique(['user_id', 'dedupe_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('in_app_notifications');
    }
};
