"use client";

import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ModuleItem } from "@/lib/types";
import ModuleCatalogCard from "./ModuleCatalogCard";

interface Props {
  modules: ModuleItem[];
  hasActiveAccess: boolean;
}

export default function ModulCatalogFilter({ modules, hasActiveAccess }: Props) {
  const [levelFilter, setLevelFilter] = useState<string>("Semua");
  const [query, setQuery] = useState("");

  const levels = ["Semua", "Pemula", "Anak-Anak", "Menengah", "Lanjutan"];

  const filtered = useMemo(() => {
    return modules.filter((m) => {
      const matchLevel = levelFilter === "Semua" || m.level === levelFilter;
      const q = query.trim().toLowerCase();
      const matchQuery =
        !q ||
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q) ||
        m.summary.toLowerCase().includes(q);
      return matchLevel && matchQuery;
    });
  }, [modules, levelFilter, query]);

  return (
    <div>
      {/* Filter Bar: Clean Flat, Border #E5E7EB */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 p-4 bg-gray-50 rounded-xl border border-[#E5E7EB]">
        <div className="flex flex-wrap gap-1.5">
          {levels.map((lv) => (
            <button
              key={lv}
              type="button"
              onClick={() => setLevelFilter(lv)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                levelFilter === lv
                  ? "bg-[#14532D] text-white"
                  : "bg-white border border-[#E5E7EB] text-gray-700 hover:bg-gray-100"
              }`}
            >
              {lv === "Semua" ? "Semua Tingkatan" : lv}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kelas..."
            className="w-full rounded-lg border border-[#E5E7EB] bg-white py-1.5 pl-9 pr-3 text-sm text-gray-900 focus:border-[#14532D] focus:outline-none"
          />
        </div>
      </div>

      {/* Cards Grid: Semua seragam, background putih, border #E5E7EB */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white p-10 text-center">
          <p className="text-sm font-semibold text-gray-700">
            Tidak ada modul yang cocok dengan pencarian Anda.
          </p>
          <button
            type="button"
            onClick={() => {
              setLevelFilter("Semua");
              setQuery("");
            }}
            className="mt-2 text-xs font-bold text-[#14532D] hover:underline"
          >
            Tampilkan semua modul
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <ModuleCatalogCard
              key={m.id}
              module={m}
              hasActiveAccess={hasActiveAccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}
