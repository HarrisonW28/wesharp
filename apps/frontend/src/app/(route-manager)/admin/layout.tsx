"use client";

/**
 * Ops route-manager segment only — `{route-manager}/layout.tsx` already applies
 * `StaffRouteGate` + permission boundary once. Duplicate gates caused double loaders.
 */
export default function RouteManagerAdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
