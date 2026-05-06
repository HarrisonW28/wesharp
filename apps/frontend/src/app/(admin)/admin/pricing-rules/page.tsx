import { redirect } from "next/navigation";

/** Legacy URL — PAYG rules live on Plans & pricing (`/admin/subscription-plans`). */
export default function AdminPricingRulesRedirectPage() {
  redirect("/admin/subscription-plans#pay-as-you-go-rules");
}
