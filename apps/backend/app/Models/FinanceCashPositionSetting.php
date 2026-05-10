<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceCashPositionSetting extends Model
{
    protected $table = 'finance_cash_position_settings';

    protected $fillable = [
        'starting_capital_pence',
        'regular_route_price_per_knife_pence',
        'trial_price_per_knife_pence',
        'route_days_per_week',
        'buffer_warning_threshold_pence',
        'conversion_target_price_pence',
        'second_machine_trigger_pence',
        'van_assessment_trigger_pence',
        'updated_by_user_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starting_capital_pence' => 'integer',
            'regular_route_price_per_knife_pence' => 'integer',
            'trial_price_per_knife_pence' => 'integer',
            'route_days_per_week' => 'decimal:2',
            'buffer_warning_threshold_pence' => 'integer',
            'conversion_target_price_pence' => 'integer',
            'second_machine_trigger_pence' => 'integer',
            'van_assessment_trigger_pence' => 'integer',
        ];
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }
}
