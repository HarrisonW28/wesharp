@php
  /** @var string|null $headline */
  /** @var string|null $body */
  /** @var string|null $subscriptionReference */
  /** @var string|null $planName */
  /** @var string|null $portalSubscriptionUrl */
  /** @var string|null $supportEmail */
  /** @var string|null $supportPhone */
@endphp

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{{ config('app.name', 'WeSharp') }}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f8;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e6e7ea;border-radius:12px;padding:20px;">
        @if(!empty($headline))
          <h1 style="margin:0 0 12px 0;font-size:18px;line-height:1.3;color:#111827;">{{ $headline }}</h1>
        @endif

        @if(!empty($body))
          <p style="margin:0 0 16px 0;font-size:14px;line-height:1.55;color:#374151;white-space:pre-wrap;">{{ $body }}</p>
        @endif

        @if(!empty($subscriptionReference))
          <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:#4b5563;">
            <strong>Reference:</strong> {{ $subscriptionReference }}
            @if(!empty($planName))
              <span style="color:#6b7280;"> · {{ $planName }}</span>
            @endif
          </p>
        @endif

        @if(!empty($portalSubscriptionUrl))
          <p style="margin:0 0 8px 0;">
            <a href="{{ $portalSubscriptionUrl }}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px;">
              Open subscription in your portal
            </a>
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Sign in to match this email to your subscription — we don’t put internal IDs in the message body.
          </p>
        @endif

        <div style="margin-top:16px;padding-top:14px;border-top:1px solid #e6e7ea;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Need a hand?{{ $supportEmail ? ' Email '.$supportEmail.'.' : '' }}{{ $supportPhone ? ' Phone '.$supportPhone.'.' : '' }}
          </p>
        </div>
      </div>

      <p style="margin:16px 0 0 0;font-size:12px;color:#6b7280;text-align:center;">
        {{ config('app.name', 'WeSharp') }}
      </p>
    </div>
  </body>
</html>
