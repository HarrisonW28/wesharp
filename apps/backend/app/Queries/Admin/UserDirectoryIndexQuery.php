<?php

declare(strict_types=1);

namespace App\Queries\Admin;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class UserDirectoryIndexQuery
{
    /** @return Builder<User> */
    public static function base(): Builder
    {
        return User::query()->orderByDesc('updated_at')->with('company:id,name,city');
    }

    /** @param  Builder<User>  $q */
    public static function applyFilters(Builder $q, Request $request): Builder
    {
        if (($s = trim((string) $request->query('q', ''))) !== '') {
            $q->where(function ($sub) use ($s): void {
                $sub->where('name', 'like', '%'.$s.'%')
                    ->orWhere('email', 'like', '%'.$s.'%');
            });
        }

        if (($role = trim((string) $request->query('role', ''))) !== '') {
            $q->where('role', $role);
        }

        if (($st = trim((string) $request->query('status', ''))) !== '') {
            $q->where('status', $st);
        }

        if (($cid = trim((string) $request->query('company_id', ''))) !== '') {
            $q->where('company_id', $cid);
        }

        if (($companyQ = trim((string) $request->query('company_q', ''))) !== '') {
            $needle = '%'.$companyQ.'%';
            $q->whereHas('company', static function ($c) use ($needle): void {
                $c->where('name', 'like', $needle);
            });
        }

        $bucket = trim((string) $request->query('role_bucket', ''));
        if ($bucket === 'internal') {
            $q->whereIn('role', UserRole::internalValues());
        } elseif ($bucket === 'customer') {
            $q->whereIn('role', [
                UserRole::CustomerOwner->value,
                UserRole::CustomerStaff->value,
            ]);
        }

        return $q;
    }
}
