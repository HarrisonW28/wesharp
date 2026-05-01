<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('reference');
            $table->foreignId('recorded_by')->nullable()->after('notes')->constrained('users')->nullOnDelete();
            $table->string('external_provider_id', 191)->nullable()->after('recorded_by')->index();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['recorded_by']);
            $table->dropColumn(['notes', 'recorded_by', 'external_provider_id']);
        });
    }
};
