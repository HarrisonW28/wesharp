import type { PublicSubscriptionPlan } from "@/lib/site-content/public-subscription-plans";
import { publicBillingCadence } from "@/lib/site-content/public-subscription-plans";
import { formatGBP } from "@/lib/format/money";

function allowanceLine(plan: PublicSubscriptionPlan): string | null {
  const parts: string[] = [];
  if (plan.included_collections != null) {
    parts.push(`${plan.included_collections} collections`);
  }
  if (plan.included_knife_allowance != null) {
    parts.push(`${plan.included_knife_allowance} knives`);
  }
  if (!parts.length) return null;
  return `${parts.join(" · ")} included per period`;
}

type Props = {
  plans: PublicSubscriptionPlan[];
  /** When `plans` is empty — minor units for guide copy */
  fallbackMonthlyMinor: number;
  headingClassName?: string;
  footer?: string;
};

/**
 * Programme / subscription catalogue for marketing pages — data from
 * `GET /api/public/site-content` (`public_subscription_plans`).
 */
export function PublicSubscriptionPlansPanel(props: Props) {
  const { plans, fallbackMonthlyMinor, headingClassName, footer } = props;

  if (plans.length === 0) {
    return (
      <>
        <div className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${headingClassName ?? ""}`}>
          {formatGBP(fallbackMonthlyMinor)}
        </div>
        {footer ? <p className="mt-2 text-xs text-muted-foreground">{footer}</p> : null}
      </>
    );
  }

  return (
    <>
      <ul className="mt-3 space-y-5">
        {plans.map((plan) => {
          const priceLabel =
            plan.currency === "GBP" ? formatGBP(plan.price_amount_minor) : `${plan.price_amount_minor} ${plan.currency}`;
          const cadence = publicBillingCadence(plan.billing_interval);
          const allowance = allowanceLine(plan);
          const overage =
            plan.overage_price_amount_minor != null && plan.currency === "GBP"
              ? `Overage from ${formatGBP(plan.overage_price_amount_minor)}`
              : plan.overage_price_amount_minor != null
                ? `Overage from ${plan.overage_price_amount_minor} ${plan.currency}`
                : null;

          return (
            <li key={plan.id} className="border-border/60 border-t pt-4 first:border-t-0 first:pt-0">
              <div className="text-sm font-semibold text-foreground">{plan.name}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                {priceLabel} <span className="text-base font-normal text-muted-foreground">{cadence}</span>
              </div>
              {plan.description ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{plan.description}</p>
              ) : null}
              {allowance ? <p className="mt-2 text-xs text-muted-foreground">{allowance}</p> : null}
              {overage ? <p className="mt-1 text-xs text-muted-foreground">{overage}</p> : null}
            </li>
          );
        })}
      </ul>
      {footer ? <p className="mt-4 text-xs text-muted-foreground">{footer}</p> : null}
    </>
  );
}
