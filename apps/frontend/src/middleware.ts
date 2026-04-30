import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Protected areas require a Clerk session. Role separation (staff vs tenant) uses the Laravel
 * `/api/v1/me` profile on top of Clerk — never trust JWT public claims for authorisation logic.
 *
 * Static assets and Next internals are excluded automatically by Clerk's matcher.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/unauthorised",
  "/forbidden",
]);

export default clerkMiddleware((auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  void auth.protect();
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};
