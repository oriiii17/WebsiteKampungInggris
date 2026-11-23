import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type RegisteredWargaAccount = { id: string; name: string; rw: string; createdAt: string };

export async function getRegisteredWargaAccounts(): Promise<RegisteredWargaAccount[]> {
  const admin = createSupabaseAdminClient();
  const [{ data: profiles, error: profileError }, { data: authPage, error: authError }] = await Promise.all([
    admin.from("profiles").select("id,email,full_name,origin_type").eq("origin_type", "warga"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (profileError) throw new Error("Daftar akun warga belum dapat dimuat.");
  if (authError) throw new Error("Data wilayah akun warga belum dapat dimuat.");
  const usersById = new Map((authPage.users || []).map((user) => [user.id, user]));
  return (profiles || []).map((profile) => {
    const user = usersById.get(profile.id);
    const metadata = user?.user_metadata || {};
    return {
      id: profile.id,
      name: String(profile.full_name || metadata.full_name || "Warga Sapen"),
      rw: String(metadata.rw || "—"),
      createdAt: user?.created_at || "",
    };
  }).sort((a, b) => a.name.localeCompare(b.name, "id"));
}
