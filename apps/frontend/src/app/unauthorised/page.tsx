import Link from "next/link";

export default function UnauthorisedPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-2xl font-semibold tracking-tight">Unable to authenticate</div>
      <p className="text-sm text-muted-foreground">
        Clerk could not attach a usable session token. Retry sign-in — if Laravel rejects the Bearer token across origins,
        check CORS headers and secrets.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
        <Link className="text-sm font-medium text-primary underline" href="/login">
          Try sign-in again
        </Link>
        <Link className="text-sm font-medium text-muted-foreground underline" href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
