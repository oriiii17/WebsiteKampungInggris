import type { MetadataRoute } from "next";
import { getClasses } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  // The public deployment hostname is owner-managed; never publish localhost or guess a domain.
  if (!siteUrl || !/^https:\/\//i.test(siteUrl)) return [];

  const pages = ["", "/kelas", "/game", "/tentang", "/faq"];
  const classes = await getClasses(false);
  const publicClassUrls = classes
    .filter((item) => item.isPublished)
    .map((item) => `/kelas/${encodeURIComponent(item.slug || item.id)}`);

  return [...pages, ...publicClassUrls].map((pathname) => ({
    url: `${siteUrl}${pathname}`,
    changeFrequency: "weekly" as const,
  }));
}
