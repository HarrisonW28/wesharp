import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Require a Clerk session only on app surfaces that carry customer/staff data. Marketing and
 * brochure routes stay public (see `(public)` segment). Role separation uses Laravel `/api/v1/me`
 * — never trust JWT public claims for authorisation logic.
 *
 * Important: pass `await auth.protect()` back through the middleware chain (Clerk awaits the
 * handler result). Fire-and-forget `void auth.protect()` allows the request to continue as
 * signed-out.
 */
const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/account(.*)",
  "/auth(.*)",
  "/venue-pending(.*)",
  "/offline(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) {
    return;
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
