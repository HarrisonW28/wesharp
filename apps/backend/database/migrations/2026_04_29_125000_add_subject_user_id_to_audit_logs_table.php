<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * User records use bigint PKs while uuidMorphs targets UUID domain rows. Store subject users
     * explicitly for role and identity audit events.
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->foreignId('subject_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->index('subject_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropForeign(['subject_user_id']);
            $table->dropColumn('subject_user_id');
        });
    }
};
