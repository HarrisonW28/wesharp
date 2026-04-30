<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knife_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('knife_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('uploaded_file_id')->nullable()->constrained('uploaded_files')->nullOnDelete();
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->string('caption')->nullable();
            $table->timestampsTz();
            $table->index('knife_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knife_photos');
    }
};
