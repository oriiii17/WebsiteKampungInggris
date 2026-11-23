import type { MetadataRoute } from "next";
import { getClasses } from "@/lib/db";
import { getSiteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const pages = ["", "/kelas", "/games", "/tentang", "/faq", "/sesi"];
  let publicClassUrls: string[] = [];
  try {
    const classes = await getClasses(false);
    publicClassUrls = classes
      .filter((item) => item.isPublished)
      .map((item) => `/kelas/${encodeURIComponent(item.slug || item.id)}`);
  } catch {
    // Keep the stable public URLs available if class storage is temporarily unavailable.
  }

  return [...pages, ...publicClassUrls].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    changeFrequency: "weekly" as const,
  }));
}
