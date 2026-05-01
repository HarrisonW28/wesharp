<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

final class GenericNotificationMailable extends Mailable
{
    use Queueable;
    use SerializesModels;

    /**
     * @param  array<string, mixed>  $viewData
     */
    public function __construct(
        public readonly string $subjectLine,
        public readonly string $viewName,
        public readonly array $data,
    ) {}

    public function build(): self
    {
        return $this->subject($this->subjectLine)
            ->view($this->viewName, $this->data);
    }
}
