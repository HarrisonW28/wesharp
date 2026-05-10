<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CostFrequency;
use App\Enums\CostStatus;
use App\Support\Costs\CostEquivalentCalculator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CostItem extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'category_id',
        'tier_label',
        'name',
        'description',
        'amount_pence',
        'currency',
        'frequency',
        'status',
        'supplier_name',
        'supplier_url',
        'priority',
        'notes',
        'is_recurring',
        'is_consumable',
        'is_seeded',
        'source',
        'source_sheet',
        'source_row',
        'seed_key',
        'starts_on',
        'ends_on',
        'next_due_on',
        'renews_on',
        'commitment_cancellable',
        'payment_method_note',
        'created_by_user_id',
        'updated_by_user_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'frequency' => CostFrequency::class,
            'status' => CostStatus::class,
            'amount_pence' => 'integer',
            'priority' => 'integer',
            'is_recurring' => 'boolean',
            'is_consumable' => 'boolean',
            'is_seeded' => 'boolean',
            'source_row' => 'integer',
            'starts_on' => 'date',
            'ends_on' => 'date',
            'next_due_on' => 'date',
            'renews_on' => 'date',
            'commitment_cancellable' => 'boolean',
            'monthly_equivalent_pence' => 'integer',
            'annual_equivalent_pence' => 'integer',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(CostCategory::class, 'category_id');
    }

    protected static function booted(): void
    {
        static::saving(function (CostItem $item): void {
            if (! $item->frequency->hasPeriodicCommitmentEquivalents()) {
                $item->monthly_equivalent_pence = null;
                $item->annual_equivalent_pence = null;

                return;
            }

            $amount = (int) $item->amount_pence;
            $item->monthly_equivalent_pence = CostEquivalentCalculator::monthlyEquivalentPence($amount, $item->frequency);
            $item->annual_equivalent_pence = CostEquivalentCalculator::annualEquivalentPence($amount, $item->frequency);
        });
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    /**
     * Default catalogue lists hide archived rows unless explicitly filtered.
     *
     * @param  Builder<CostItem>  $query
     * @return Builder<CostItem>
     */
    public function scopeExcludeArchivedByDefault(Builder $query): Builder
    {
        return $query->where('status', '!=', CostStatus::Archived);
    }
}
