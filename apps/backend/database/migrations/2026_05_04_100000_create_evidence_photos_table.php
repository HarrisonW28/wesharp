<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evidence_photos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('uploaded_file_id')->constrained('uploaded_files')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('captured_at');
            $table->foreignUuid('route_stop_id')->nullable()->constrained('route_stops')->cascadeOnDelete();
            $table->foreignUuid('order_id')->nullable()->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('knife_id')->nullable()->constrained('knives')->nullOnDelete();
            $table->string('category', 48);
            $table->string('visibility', 24);
            $table->string('caption', 500)->nullable();
            $table->text('notes')->nullable();
            $table->timestampTz('archived_at')->nullable()->index();
            $table->timestampsTz();

            $table->index(['route_stop_id', 'archived_at']);
            $table->index(['order_id', 'archived_at']);
            $table->index(['category', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evidence_photos');
    }
};
