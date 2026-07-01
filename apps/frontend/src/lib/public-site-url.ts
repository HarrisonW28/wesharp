/** Canonical marketing origin with no trailing slash (sitemap, absolute metadata). */
export function publicSiteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.wesharp.co.uk";
  return raw.replace(/\/$/, "");
}
