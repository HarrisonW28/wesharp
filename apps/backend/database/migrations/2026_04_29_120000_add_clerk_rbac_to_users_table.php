<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('clerk_user_id', 96)->nullable()->unique();
            $table->string('role', 48)->nullable()->index();
            $table->foreignUuid('company_id')->nullable()->index()->constrained('companies')->nullOnDelete();
            $table->string('status', 32)->nullable()->index();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropColumn(['clerk_user_id', 'role', 'company_id', 'status']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable(false)->change();
        });
    }
};
