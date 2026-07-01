import { Suspense } from "react";

import { AccountOnboardingClient } from "./AccountOnboardingClient";

export default function AccountOnboardingPage() {
  return (
    <Suspense fallback={null}>
      <AccountOnboardingClient />
    </Suspense>
  );
}
