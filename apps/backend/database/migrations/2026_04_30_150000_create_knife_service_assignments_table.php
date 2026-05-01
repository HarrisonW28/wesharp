<?php

use App\Enums\KnifeServiceKind;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('knife_service_assignments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->uuid('knife_id');
            $table->uuid('order_id');
            $table->uuid('company_id');
            $table->string('service_kind', 32);
            $table->timestampTz('linked_at');
            $table->timestampTz('unlinked_at')->nullable();
            $table->timestampsTz();

            $table->index(['knife_id', 'unlinked_at']);
            $table->index('order_id');
            $table->index('company_id');

            $table->foreign('knife_id')->references('id')->on('knives')->cascadeOnDelete();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('company_id')->references('id')->on('companies')->cascadeOnDelete();
        });

        DB::table('knives')->whereNotNull('order_id')->orderBy('id')->chunk(100, function ($rows): void {
            foreach ($rows as $row) {
                DB::table('knife_service_assignments')->insert([
                    'id' => (string) Str::uuid(),
                    'knife_id' => $row->id,
                    'order_id' => $row->order_id,
                    'company_id' => $row->company_id,
                    'service_kind' => KnifeServiceKind::Intake->value,
                    'linked_at' => $row->created_at ?? now(),
                    'unlinked_at' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('knife_service_assignments');
    }
};
