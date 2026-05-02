<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_portal_invites', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('company_id')->constrained()->cascadeOnDelete();
            $table->string('email', 191);
            $table->string('status', 32);
            $table->string('token_hash', 64);
            $table->foreignId('invited_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('expires_at');
            $table->timestampTz('last_sent_at')->nullable();
            $table->timestampTz('accepted_at')->nullable();
            $table->string('clerk_invitation_id')->nullable();
            $table->text('last_clerk_error')->nullable();
            $table->timestampsTz();

            $table->unique(['company_id', 'email']);
            $table->index(['company_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_portal_invites');
    }
};
