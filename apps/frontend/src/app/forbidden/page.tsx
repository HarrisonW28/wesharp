import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-2xl font-semibold tracking-tight">Insufficient access</div>
      <p className="text-sm text-muted-foreground">
        Clerk signed you in, but Laravel says this workspace is unavailable for your role. The UI hides navigation cues,
        however every API endpoint still verifies permissions independently.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
        <Link className="text-sm font-medium text-primary underline" href="/admin/dashboard">
          Operations console
        </Link>
        <Link className="text-sm font-medium text-primary underline" href="/account/dashboard">
          Customer portal
        </Link>
        <Link className="text-sm font-medium text-muted-foreground underline" href="/">
          Home
        </Link>
      </div>
    </main>
  );
}
