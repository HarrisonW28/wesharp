<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ForecastScenarioType;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinanceForecastScenario extends Model
{
    use HasUuids;

    protected $table = 'finance_forecast_scenarios';

    protected $fillable = [
        'name',
        'scenario_type',
        'inputs',
        'created_by_user_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scenario_type' => ForecastScenarioType::class,
            'inputs' => 'array',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
