import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession, isAdminSession } from "@/lib/auth";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  const session = await getServerSession();
  if (!isAdminSession(session)) {
    redirect("/admin/login");
  }

  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Memuat Dasbor Admin…</div>}>
      <AdminDashboardClient />
    </Suspense>
  );
}
