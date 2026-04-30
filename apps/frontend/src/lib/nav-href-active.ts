/**
 * Active nav item for bottom/side links. Avoids `/admin/routes` matching `/admin/routes/today`.
 */
export function navHrefIsActive(pathname: string, href: string): boolean {
  if (pathname === href) {
    return true;
  }

  if (href === "/admin/routes/today") {
    return pathname.startsWith(`${href}/`);
  }

  if (href === "/admin/routes") {
    if (!pathname.startsWith(`${href}/`)) {
      return false;
    }
    return !pathname.startsWith("/admin/routes/today");
  }

  return pathname.startsWith(`${href}/`);
}
