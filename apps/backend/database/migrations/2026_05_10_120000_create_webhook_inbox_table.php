<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_inbox', function (Blueprint $table): void {
            $table->id();
            $table->string('provider', 32)->index();
            $table->string('external_id', 255);
            $table->string('event_type', 160)->index();
            $table->string('processing_state', 32)->default('received')->index();
            $table->text('last_error')->nullable();
            $table->timestampTz('received_at');
            $table->timestampTz('processed_at')->nullable();
            $table->timestampsTz();

            $table->unique(['provider', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_inbox');
    }
};
