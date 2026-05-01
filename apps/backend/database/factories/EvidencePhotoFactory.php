<?php

namespace Database\Factories;

use App\Enums\EvidencePhotoCategory;
use App\Enums\EvidencePhotoVisibility;
use App\Models\EvidencePhoto;
use App\Models\Order;
use App\Models\RouteStop;
use App\Models\UploadedFile;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EvidencePhoto>
 */
class EvidencePhotoFactory extends Factory
{
    protected $model = EvidencePhoto::class;

    public function definition(): array
    {
        return [
            'uploaded_file_id' => UploadedFile::factory(),
            'uploaded_by_user_id' => null,
            'captured_at' => now(),
            'route_stop_id' => null,
            'order_id' => null,
            'knife_id' => null,
            'category' => EvidencePhotoCategory::GeneralRouteStop,
            'visibility' => EvidencePhotoVisibility::InternalOnly,
            'caption' => null,
            'notes' => null,
            'archived_at' => null,
        ];
    }

    public function forRouteStop(RouteStop $stop): static
    {
        return $this->state(fn (): array => [
            'route_stop_id' => $stop->id,
        ]);
    }

    public function forOrder(Order $order): static
    {
        return $this->state(fn (): array => [
            'order_id' => $order->id,
            'category' => EvidencePhotoCategory::GeneralOrder,
        ]);
    }
}
