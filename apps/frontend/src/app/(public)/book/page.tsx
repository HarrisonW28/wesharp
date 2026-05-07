import { BookPageClient } from "./BookPageClient";
import { fetchPublicSiteData } from "@/lib/site-content/fetch-site-content";

export const revalidate = 60;

export default async function BookPage() {
  const siteData = await fetchPublicSiteData();
  return (
    <BookPageClient booking={siteData.content.booking} publicBooking={siteData.publicBooking} />
  );
}
