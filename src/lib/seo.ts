import { getSiteUrl } from "@/lib/site";

export function canonicalUrl(pathname: string): string {
  return `${getSiteUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}
