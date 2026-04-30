<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('knife_photos', function (Blueprint $table): void {
            $table->string('photo_kind', 24)->default('general')->after('caption');
            $table->foreignUuid('order_id')->nullable()->after('knife_id')->constrained()->nullOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->after('uploaded_file_id')->constrained('users')->nullOnDelete();
            $table->index('photo_kind');
            $table->index('order_id');
        });
    }

    public function down(): void
    {
        Schema::table('knife_photos', function (Blueprint $table): void {
            $table->dropForeign(['order_id']);
            $table->dropForeign(['uploaded_by_user_id']);
            $table->dropColumn(['photo_kind', 'order_id', 'uploaded_by_user_id']);
        });
    }
};
