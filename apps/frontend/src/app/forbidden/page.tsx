import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <div className="text-2xl font-semibold tracking-tight">Insufficient access</div>
      <p className="text-sm text-muted-foreground">
        Clerk signed you in, but this URL is not available for your backend role and company. The sidebar only shows
        permitted areas; every API route enforces the same rules server-side.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-6">
        <Link className="text-sm font-medium text-primary underline" href="/">
          Home
        </Link>
        <span className="text-xs text-muted-foreground">Use the app menu for workspaces you can access.</span>
      </div>
    </main>
  );
}
