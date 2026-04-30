/**
 * Lightweight auth funnel routes — deliberately no {@link PublicShell} header/footer so we do not nest
 * marketing chrome beside Clerk-hosted components.
 */
export default function AuthMinimalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
