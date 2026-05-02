<?php

namespace App\Models;

use App\Enums\NoteVisibility;
use App\Support\Notes\NoteStaffVisibility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Note extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'author_id',
        'body',
        'visibility',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'visibility' => NoteVisibility::class,
        ];
    }

    /**
     * @param  Builder<Note>  $query
     * @return Builder<Note>
     */
    public function scopeVisibleToStaff(Builder $query, User $viewer): Builder
    {
        return NoteStaffVisibility::applyStaffScope($query, $viewer);
    }

    public function noteable(): MorphTo
    {
        return $this->morphTo(__FUNCTION__);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
