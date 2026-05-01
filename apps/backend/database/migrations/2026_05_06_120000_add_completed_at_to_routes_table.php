<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('routes', function (Blueprint $table): void {
            $table->timestampTz('completed_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('routes', function (Blueprint $table): void {
            $table->dropColumn('completed_at');
        });
    }
};
