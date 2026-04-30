import Link from "next/link";

export default function VenuePendingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <div className="text-2xl font-semibold tracking-tight">Awaiting organisation link</div>
      <p className="text-sm text-muted-foreground">
        Your Clerk account is active, but no WeSharp company is attached yet. A super admin needs to associate this login
        in the Ops CRM.
      </p>
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:opacity-90"
          onClick={() => typeof window !== "undefined" && window.location.reload()}
        >
          Reload
        </button>
        <Link className="text-muted-foreground underline" href="/login">
          Use a different login
        </Link>
      </div>
    </main>
  );
}
