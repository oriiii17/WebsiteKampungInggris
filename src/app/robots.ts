import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/akun", "/keranjang", "/checkout", "/kelas-saya", "/game/play", "/game/host", "/sesi/kelola", "/api"],
    }],
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
