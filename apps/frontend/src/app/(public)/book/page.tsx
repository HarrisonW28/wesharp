import { BookPageClient } from "./BookPageClient";
import { fetchPublicSiteContent } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function BookPage() {
  const site = await fetchPublicSiteContent();
  return <BookPageClient booking={site.booking} />;
}
