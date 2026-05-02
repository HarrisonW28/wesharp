<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_feedback', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('order_id')->unique();
            $table->uuid('company_id')->index();
            $table->timestampTz('invitation_sent_at')->nullable();
            $table->timestampTz('submitted_at')->nullable();
            $table->unsignedTinyInteger('rating')->nullable();
            $table->string('comment', 6000)->nullable();
            $table->boolean('testimonial_interested')->default(false);
            $table->timestampTz('staff_reviewed_at')->nullable();
            $table->foreignId('staff_reviewed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('testimonial_marketing_approved_at')->nullable();
            $table->timestampsTz();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('company_id')->references('id')->on('companies');
            $table->index(['company_id', 'submitted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_feedback');
    }
};
