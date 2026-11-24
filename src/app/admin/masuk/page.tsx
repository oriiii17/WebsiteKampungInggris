import AdminLoginForm from "@/components/AdminLoginForm";

function safeAdminDestination(value?: string) {
  if (!value || !value.startsWith("/admin")) return "/admin";
  if (value.startsWith("//") || value.includes("\\")) return "/admin";
  return value;
}

export default async function AdminMasukPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const params = await searchParams;
  return <AdminLoginForm nextUrl={safeAdminDestination(params.next)} expired={params.expired === "1"} />;
}
