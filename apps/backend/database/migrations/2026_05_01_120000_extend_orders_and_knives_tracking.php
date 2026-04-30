<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->foreignUuid('route_id')->nullable()->after('booking_id')->constrained('routes')->nullOnDelete();
            $table->unsignedInteger('knife_count')->default(0)->after('currency');
            $table->unsignedBigInteger('price_per_knife_pence')->nullable()->after('knife_count');
            $table->unsignedBigInteger('discount_pence')->default(0)->after('price_per_knife_pence');
            $table->string('payment_status', 32)->default('unpaid')->after('discount_pence');
            $table->index('payment_status');
            $table->index('route_id');
        });

        Schema::table('knives', function (Blueprint $table): void {
            $table->string('tag_id', 64)->nullable()->after('order_id');
            $table->string('knife_type', 96)->nullable()->after('tag_id')->index();
            $table->text('description')->nullable()->after('knife_type');
            $table->text('condition_before')->nullable()->after('description');
            $table->text('damage_notes')->nullable()->after('condition_before');
            $table->foreignId('sharpened_by_user_id')->nullable()->after('knife_status')->constrained('users')->nullOnDelete();
            $table->foreignId('quality_checked_by_user_id')->nullable()->after('sharpened_by_user_id')->constrained('users')->nullOnDelete();
            $table->foreignId('returned_by_user_id')->nullable()->after('quality_checked_by_user_id')->constrained('users')->nullOnDelete();
            $table->index(['order_id', 'knife_status']);
        });

        foreach (DB::table('knives')->orderBy('created_at')->cursor() as $row) {
            if ($row->tag_id !== null && $row->tag_id !== '') {
                continue;
            }

            DB::table('knives')->where('id', $row->id)->update([
                'tag_id' => 'WS-'.str_replace('-', '', (string) $row->id),
            ]);
        }

        Schema::table('knives', function (Blueprint $table): void {
            $table->unique('tag_id');
        });
    }

    public function down(): void
    {
        Schema::table('knives', function (Blueprint $table): void {
            $table->dropUnique(['tag_id']);
            $table->dropForeign(['sharpened_by_user_id']);
            $table->dropForeign(['quality_checked_by_user_id']);
            $table->dropForeign(['returned_by_user_id']);
            $table->dropIndex(['order_id', 'knife_status']);
            $table->dropColumn([
                'tag_id',
                'knife_type',
                'description',
                'condition_before',
                'damage_notes',
                'sharpened_by_user_id',
                'quality_checked_by_user_id',
                'returned_by_user_id',
            ]);
        });

        Schema::table('orders', function (Blueprint $table): void {
            $table->dropForeign(['route_id']);
            $table->dropColumn([
                'route_id',
                'knife_count',
                'price_per_knife_pence',
                'discount_pence',
                'payment_status',
            ]);
        });
    }
};
