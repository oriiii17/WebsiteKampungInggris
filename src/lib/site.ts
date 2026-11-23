import type { Metadata } from "next";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
    || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    || process.env.VERCEL_URL?.trim()
    || "localhost:3000";
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return withProtocol.replace(/\/+$/, "");
}

export function publicPageMetadata({
  title,
  description,
  pathname,
}: {
  title: string;
  description: string;
  pathname: string;
}): Metadata {
  const siteUrl = getSiteUrl();
  const brandedTitle = `${title} | Kampung Inggris Sapen`;
  const image = "/images/baru/LatarBelakang.webp";
  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}${pathname}` },
    openGraph: {
      type: "website",
      title: brandedTitle,
      description,
      url: `${siteUrl}${pathname}`,
      siteName: "Kampung Inggris Sapen",
      locale: "id_ID",
      images: [{ url: image, alt: "Kampung Inggris Sapen" }],
    },
  };
}
