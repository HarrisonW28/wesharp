/**
 * Maps API `subject_type` (Auditable class basename in snake_case) to an admin console path.
 */
export function adminHrefForAuditSubject(
  subjectType: string | undefined,
  subjectId: string | undefined,
): string | null {
  if (!subjectType || !subjectId) {
    return null;
  }

  switch (subjectType) {
    case "company":
      return `/admin/crm/${subjectId}`;
    case "booking":
      return `/admin/bookings/${subjectId}`;
    case "order":
      return `/admin/orders/${subjectId}`;
    case "invoice":
      return `/admin/invoices/${subjectId}`;
    case "knife":
      return `/admin/knives/${subjectId}`;
    case "operational_route":
      return `/admin/routes/${subjectId}`;
    case "user":
      return `/admin/users/${subjectId}`;
    case "payment":
      return `/admin/payments`;
    case "route_stop":
      return null;
    default:
      return null;
  }
}
