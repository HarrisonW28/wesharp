<?php

declare(strict_types=1);

namespace App\Support\Routes;

use App\Enums\EvidencePhotoCategory;
use App\Enums\RouteStopStatus;
use App\Models\Booking;
use App\Models\OperationalRoute;
use App\Models\RouteStop;
use App\Models\User;
use App\Support\Evidence\EvidencePhotoRequirements;
use App\Support\Permissions;
use Illuminate\Support\Collection;

final class RouteCompletionSummary
{
    /**
     * @return array<string, mixed>
     */
    public static function build(OperationalRoute $route, ?User $viewer = null): array
    {
        $route->loadMissing([
            'stops.booking.company:id,name',
            'stops.booking.orders:id,booking_id',
        ]);

        /** @var Collection<int, RouteStop> $stops */
        $stops = $route->stops;

        $completedSuccess = 0;
        $failed = 0;
        $outstanding = 0;
        $collectedStops = 0;
        $returnedStops = 0;
        $knifeEstimateCollected = 0;

        /** @var list<array<string, mixed>> $outstandingRows */
        $outstandingRows = [];
        /** @var list<array<string, mixed>> $failedRows */
        $failedRows = [];
        /** @var list<array<string, mixed>> $photoGaps */
        $photoGaps = [];
        /** @var list<array<string, mixed>> $issueNotes */
        $issueNotes = [];

        $requireCollection = (bool) config('wesharp_evidence.require_collection_photo', false);
        $requireReturn = (bool) config('wesharp_evidence.require_return_photo', false);
        $requireFailed = (bool) config('wesharp_evidence.require_failed_collection_photo', false);

        foreach ($stops as $stop) {
            $status = $stop->route_stop_status;
            $booking = $stop->booking;

            if ($status === RouteStopStatus::Completed) {
                $completedSuccess++;
            } elseif ($status === RouteStopStatus::Skipped) {
                $failed++;
                $failedRows[] = self::stopRow($stop, $booking);
            } else {
                $outstanding++;
                $outstandingRows[] = self::stopRow($stop, $booking);
            }

            if ($status !== null && self::isCollectedPhase($status)) {
                $collectedStops++;
                $knifeEstimateCollected += self::knifeCountForStop($stop, $booking);
            }

            if ($status !== null && self::isReturnedPhase($status)) {
                $returnedStops++;
            }

            $gaps = self::missingPhotosForStop($stop, $requireCollection, $requireReturn, $requireFailed);
            if ($gaps !== []) {
                $photoGaps[] = [
                    'stop_sequence' => $stop->sequence,
                    'company_name' => $booking?->company?->name,
                    'missing' => $gaps,
                ];
            }

            $issues = self::gatherIssueLines($stop);
            if ($issues !== []) {
                $issueNotes[] = [
                    'stop_sequence' => $stop->sequence,
                    'company_name' => $booking?->company?->name,
                    'lines' => $issues,
                ];
            }
        }

        $ordersCollected = self::countDistinctOrders($stops, static fn (RouteStop $s): bool => self::isCollectedPhase(
            $s->route_stop_status ?? RouteStopStatus::NotStarted
        ));
        $ordersReturned = self::countDistinctOrders($stops, static fn (RouteStop $s): bool => self::isReturnedPhase(
            $s->route_stop_status ?? RouteStopStatus::NotStarted
        ));

        $hasOutstanding = $outstanding > 0;
        $hasPhotoGaps = $photoGaps !== [];
        $blocks = $hasOutstanding || $hasPhotoGaps;

        /** @var list<string> $blockers */
        $blockers = array_values(array_filter([
            $hasOutstanding ? 'outstanding_stops' : null,
            $hasPhotoGaps ? 'missing_required_photos' : null,
        ]));

        return [
            'stops_total' => $stops->count(),
            'stops_completed_success' => $completedSuccess,
            'stops_failed' => $failed,
            'stops_outstanding' => $outstanding,
            'stops_collected' => $collectedStops,
            'stops_returned' => $returnedStops,
            'items_estimate_collected' => $knifeEstimateCollected,
            'orders_collected' => $ordersCollected,
            'orders_returned' => $ordersReturned,
            'outstanding_stops' => $outstandingRows,
            'failed_stops' => $failedRows,
            'photo_gaps' => $photoGaps,
            'notes_and_issues' => $issueNotes,
            'route_notes' => $route->notes,
            'evidence_requirements' => [
                'require_collection_photo' => $requireCollection,
                'require_return_photo' => $requireReturn,
                'require_failed_collection_photo' => $requireFailed,
            ],
            'blocks_completion' => $blocks,
            'blockers' => $blockers,
            'completion_rules' => [
                'Finish or fail every stop before completing the route. Open stops block drivers from completing.',
                'When collection, return, or failed-visit photos are required by settings, missing proof blocks drivers until uploaded.',
                'Administrators with route completion override may force completion when something unavoidable prevents a tidy close-out.',
            ],
            'can_force_complete' => $viewer !== null && Permissions::userMay($viewer, Permissions::ROUTES_COMPLETE_OVERRIDE),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function stopRow(RouteStop $stop, ?Booking $booking): array
    {
        return [
            'sequence' => $stop->sequence,
            'route_stop_status' => $stop->route_stop_status?->value,
            'route_stop_status_label' => RouteFormatting::stopStatusPublicLabel($stop->route_stop_status),
            'company_name' => $booking?->company?->name,
            'failure_reason' => $stop->failure_reason,
            'failure_notes' => $stop->failure_notes,
        ];
    }

    /**
     * @return list<string>
     */
    private static function gatherIssueLines(RouteStop $stop): array
    {
        $lines = [];
        if (is_string($stop->failure_notes) && trim($stop->failure_notes) !== '') {
            $lines[] = 'Failure: '.trim($stop->failure_notes);
        }
        if (is_string($stop->failure_reason) && trim($stop->failure_reason) !== '') {
            $lines[] = 'Reason: '.trim($stop->failure_reason);
        }
        if (is_string($stop->damage_notes) && trim($stop->damage_notes) !== '') {
            $lines[] = 'Damage / handling: '.trim($stop->damage_notes);
        }

        return $lines;
    }

    private static function knifeCountForStop(RouteStop $stop, ?Booking $booking): int
    {
        if ($stop->actual_knife_count !== null) {
            return max(0, (int) $stop->actual_knife_count);
        }

        return max(0, (int) ($booking?->estimated_knife_count ?? 0));
    }

    /**
     * @param  Collection<int, RouteStop>  $stops
     */
    private static function countDistinctOrders(Collection $stops, callable $predicate): int
    {
        $ids = [];
        foreach ($stops as $stop) {
            if (! $predicate($stop)) {
                continue;
            }
            foreach ($stop->booking?->orders ?? [] as $order) {
                $ids[(string) $order->id] = true;
            }
        }

        return count($ids);
    }

    private static function isCollectedPhase(RouteStopStatus $status): bool
    {
        return in_array($status, [
            RouteStopStatus::Collected,
            RouteStopStatus::InSharpening,
            RouteStopStatus::Returned,
            RouteStopStatus::Completed,
        ], true);
    }

    private static function isReturnedPhase(RouteStopStatus $status): bool
    {
        return in_array($status, [
            RouteStopStatus::Returned,
            RouteStopStatus::Completed,
        ], true);
    }

    /**
     * @return list<array{category: string, label: string}>
     */
    private static function missingPhotosForStop(
        RouteStop $stop,
        bool $requireCollection,
        bool $requireReturn,
        bool $requireFailed,
    ): array {
        $status = $stop->route_stop_status;
        $missing = [];

        if ($status === RouteStopStatus::Skipped) {
            if ($requireFailed && ! EvidencePhotoRequirements::hasActivePhoto($stop, EvidencePhotoCategory::FailedCollection)) {
                $missing[] = ['category' => 'failed_collection', 'label' => 'Failed visit photo'];
            }

            return $missing;
        }

        if ($status === null) {
            return $missing;
        }

        if ($requireCollection && self::needsCollectionPhoto($status)) {
            if (! EvidencePhotoRequirements::hasActivePhoto($stop, EvidencePhotoCategory::CollectionProof)) {
                $missing[] = ['category' => 'collection_proof', 'label' => 'Collection proof'];
            }
        }

        if ($requireReturn && self::needsReturnPhoto($status)) {
            if (! EvidencePhotoRequirements::hasActivePhoto($stop, EvidencePhotoCategory::ReturnProof)) {
                $missing[] = ['category' => 'return_proof', 'label' => 'Return proof'];
            }
        }

        return $missing;
    }

    private static function needsCollectionPhoto(RouteStopStatus $status): bool
    {
        return self::isCollectedPhase($status);
    }

    private static function needsReturnPhoto(RouteStopStatus $status): bool
    {
        return self::isReturnedPhase($status);
    }
}
