import React, { Suspense } from "react";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export default async function AdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Memuat Dasbor Admin…</div>}>
      <AdminDashboardClient />
    </Suspense>
  );
}
