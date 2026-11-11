import React from "react";
import Link from "next/link";
import { Award, BookOpen, Medal, Trophy } from "lucide-react";
import { getWeeklyLeaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const { weekLabel, entries } = await getWeeklyLeaderboard();
  const podium = entries.slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 bg-white">
      {/* Header Bersih, Judul 36px Hitam Flat */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 sm:p-8">
        <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-[#14532D]">
          Pekan Kompetisi {weekLabel}
        </span>

        <h1 className="mt-3 text-[30px] sm:text-[36px] font-extrabold text-gray-900 leading-[1.25] tracking-tight">
          Papan Juara Mingguan Kampung Sapen
        </h1>

        <p className="mt-2 text-[16px] text-gray-600 leading-[1.6] max-w-2xl">
          Kerjakan kuis pilihan ganda dan game kosakata di setiap modul untuk mengumpulkan
          skor latihan terbaik Anda pekan ini.
        </p>

        {/* Podium Top 3: Clean White, Border #E5E7EB */}
        {podium.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {podium.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-lg border border-[#E5E7EB] bg-gray-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-gray-900">
                    {item.score} Poin
                  </span>
                </div>
                <h2 className="mt-3 truncate text-base font-bold text-gray-900">
                  {item.participantName}
                </h2>
                <p className="text-xs font-semibold text-[#14532D] mt-0.5">
                  {item.originBadge}
                </p>
                <p className="mt-2 truncate text-xs text-gray-500">
                  {item.moduleTitle} • {item.gameType}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabel Peringkat Lengkap */}
      <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E7EB] px-6 py-4 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-[#14532D]" />
            <h2 className="text-base font-bold text-gray-900">
              Daftar Seluruh Peringkat Pekan Ini
            </h2>
          </div>
          <Link
            href="/modul"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#14532D] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0F3F22] transition"
          >
            Ikuti Latihan Soal
          </Link>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center">
            <Award className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              Belum ada skor tercatat minggu ini. Mulai latihan untuk menjadi juara pertama!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <span className="w-6 text-center font-bold text-sm text-gray-400">
                    #{idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {entry.participantName}
                      </p>
                      <span className="text-[11px] font-medium text-gray-500">
                        ({entry.originBadge})
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3" />
                      {entry.moduleTitle} — {entry.gameType}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-gray-900">
                    {entry.score} <span className="text-xs font-normal text-gray-500">Poin</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
