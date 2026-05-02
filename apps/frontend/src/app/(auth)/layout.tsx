/**
 * Lightweight auth funnel routes — deliberately no {@link PublicShell} header/footer so we do not nest
 * marketing chrome beside Clerk-hosted components.
 */
export default function AuthMinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background pb-[env(safe-area-inset-bottom)] supports-[min-height:100dvh]:min-h-[100dvh]">
      {children}
    </div>
  );
}
