<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class MarkRouteStopSkippedRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'failure_reason' => ['required', 'string', 'min:3', 'max:2000'],
            'failure_notes' => ['nullable', 'string', 'max:20000'],
            /** Legacy ack — prefer route-stop evidence photos when settings require them. */
            'evidence_placeholder_acknowledged' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array{failure_reason: string, failure_notes: ?string, failure_meta: ?array<string, mixed>}
     */
    public function validatedPayload(): array
    {
        /** @var array{failure_reason: string, failure_notes?: string|null, evidence_placeholder_acknowledged?: bool} $v */
        $v = $this->validated();
        $notes = isset($v['failure_notes']) && is_string($v['failure_notes']) && trim($v['failure_notes']) !== ''
            ? trim($v['failure_notes'])
            : null;

        $meta = null;
        if (! empty($v['evidence_placeholder_acknowledged'])) {
            $meta = [
                'photo_evidence' => 'placeholder_acknowledged',
                'target_sprint' => '5.4',
            ];
        }

        return [
            'failure_reason' => trim($v['failure_reason']),
            'failure_notes' => $notes,
            'failure_meta' => $meta,
        ];
    }
}
