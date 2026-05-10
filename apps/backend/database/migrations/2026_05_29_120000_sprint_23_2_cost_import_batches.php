<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_import_batches', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('type', 64)->default('costs_workbook');
            $table->string('filename');
            $table->string('disk_path')->nullable();
            $table->foreignId('uploaded_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('status', 32);
            $table->unsignedInteger('rows_detected')->default(0);
            $table->unsignedInteger('rows_created')->default(0);
            $table->unsignedInteger('rows_updated')->default(0);
            $table->unsignedInteger('rows_skipped')->default(0);
            $table->json('warnings_json')->nullable();
            $table->json('errors_json')->nullable();
            $table->json('cash_snapshot_json')->nullable();
            $table->json('auxiliary_sheets_json')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });

        Schema::create('cost_import_rows', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('cost_import_batch_id')->constrained('cost_import_batches')->cascadeOnDelete();
            $table->string('sheet_name');
            $table->unsignedInteger('row_number');
            $table->json('raw_data');
            $table->json('mapped_data')->nullable();
            $table->string('preview_action', 32);
            $table->string('applied_action', 32)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index(['cost_import_batch_id', 'preview_action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cost_import_rows');
        Schema::dropIfExists('cost_import_batches');
    }
};
