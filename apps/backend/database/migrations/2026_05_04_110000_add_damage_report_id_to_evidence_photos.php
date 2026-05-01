<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evidence_photos', function (Blueprint $table): void {
            $table->foreignUuid('damage_report_id')->nullable()->after('knife_id')->constrained('damage_reports')->nullOnDelete();
            $table->index(['damage_report_id', 'archived_at']);
        });
    }

    public function down(): void
    {
        Schema::table('evidence_photos', function (Blueprint $table): void {
            $table->dropIndex(['damage_report_id', 'archived_at']);
            $table->dropConstrainedForeignId('damage_report_id');
        });
    }
};
