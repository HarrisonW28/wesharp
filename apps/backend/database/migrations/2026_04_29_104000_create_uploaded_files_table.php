<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uploaded_files', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuidMorphs('fileable');
            $table->string('disk', 64)->default('local');
            $table->string('path', 2048);
            $table->string('original_filename');
            $table->string('mime_type', 128)->nullable();
            $table->unsignedBigInteger('byte_size')->nullable();
            $table->timestampsTz();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uploaded_files');
    }
};
