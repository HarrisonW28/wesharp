<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_deliveries', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('company_id')->nullable()->index();
            $table->foreignId('recipient_user_id')->nullable()->index();
            $table->string('recipient_email')->nullable()->index();
            $table->string('recipient_name')->nullable();

            $table->string('channel', 32)->index(); // email, sms, slack, etc.
            $table->string('type', 120)->index(); // e.g. invoice.sent, booking.confirmed

            $table->string('source_type', 200)->nullable()->index();
            $table->uuid('source_id')->nullable()->index();

            $table->string('status', 32)->index(); // queued | sent | failed | skipped
            $table->string('idempotency_key', 255)->nullable();

            $table->timestamp('queued_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->string('failure_reason', 1000)->nullable();

            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['channel', 'type', 'idempotency_key'], 'uniq_notification_delivery_idem')
                ->whereNotNull('idempotency_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_deliveries');
    }
};
