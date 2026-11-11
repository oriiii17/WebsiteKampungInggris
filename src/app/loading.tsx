import React from "react";
import { Loader2 } from "lucide-react";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-[#14532D]">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
      <p className="text-sm font-bold text-gray-700">Memuat halaman...</p>
      <p className="text-xs text-gray-400">Kampung Inggris Sapen</p>
    </div>
  );
}
