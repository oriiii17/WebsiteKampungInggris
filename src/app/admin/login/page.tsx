import { redirect } from "next/navigation";

export default async function LegacyAdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = (await searchParams).next;
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  redirect(`/admin/masuk${destination}`);
}
