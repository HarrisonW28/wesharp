<?php

declare(strict_types=1);

namespace App\Support\Notes;

use App\Enums\NoteVisibility;
use App\Models\Note;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;

final class NoteStaffVisibility
{
    public static function mayCreate(User $user, NoteVisibility $visibility): bool
    {
        if (! Permissions::userMay($user, Permissions::COMPANIES_UPDATE)) {
            return false;
        }

        return match ($visibility) {
            NoteVisibility::Internal, NoteVisibility::Customer => true,
            NoteVisibility::Route => Permissions::userMay($user, Permissions::ROUTES_VIEW),
            NoteVisibility::Finance => self::userHasFinanceBucket($user),
        };
    }

    public static function visibleToStaff(Note $note, User $viewer): bool
    {
        return self::visibleQuery($viewer)->whereKey($note->getKey())->exists();
    }

    /**
     * @param  Builder<Note>|Relation  $query
     * @return Builder<Note>|Relation
     */
    public static function applyStaffScope(Builder|Relation $query, User $viewer): Builder|Relation
    {
        return $query->where(function ($w) use ($viewer): void {
            $w->whereIn('visibility', [
                NoteVisibility::Internal->value,
                NoteVisibility::Customer->value,
            ]);

            if (Permissions::userMay($viewer, Permissions::ROUTES_VIEW)) {
                $w->orWhere('visibility', NoteVisibility::Route->value);
            }

            if (self::userHasFinanceBucket($viewer)) {
                $w->orWhere('visibility', NoteVisibility::Finance->value);
            }
        });
    }

    private static function visibleQuery(User $viewer): Builder
    {
        return self::applyStaffScope(Note::query(), $viewer);
    }

    private static function userHasFinanceBucket(User $user): bool
    {
        return Permissions::userMay($user, Permissions::INVOICES_VIEW)
            || Permissions::userMay($user, Permissions::REPORTS_FINANCE)
            || Permissions::userMay($user, Permissions::PAYMENTS_VIEW)
            || Permissions::userMay($user, Permissions::SUBSCRIPTIONS_VIEW);
    }
}
