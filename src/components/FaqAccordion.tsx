"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    question: "Bagaimana cara mendapatkan Kode Akses untuk belajar gratis?",
    answer:
      "Kode Akses dibagikan langsung oleh pengelola program kepada peserta yang terdaftar. Silakan hubungi pengelola program belajar di lingkungan Anda untuk mendapatkan kode akses tersebut.",
  },
  {
    question: "Apakah website ini benar-benar gratis?",
    answer:
      "Ya, peserta yang memiliki Kode Akses resmi dari pengelola program dapat menggunakan seluruh fitur platform ini 100% gratis — tanpa biaya dan tanpa kartu kredit.",
  },
  {
    question: "Apakah saya harus memasukkan email dan kata sandi untuk belajar?",
    answer:
      "Tidak perlu! Peserta dengan Kode Akses cukup memasukkan nama panggilan dan kode akses — tanpa email, tanpa kata sandi. Sangat mudah bahkan untuk pengguna yang tidak terbiasa dengan teknologi.",
  },
  {
    question: "Apakah platform ini bisa dibuka melalui HP?",
    answer:
      "Tentu saja! Website ini dirancang mobile-first sehingga sangat ringan, nyaman dibuka melalui smartphone, tablet, maupun laptop di browser apa pun tanpa perlu menginstal aplikasi tambahan.",
  },
  {
    question: "Saya dari luar komunitas, apakah tetap bisa ikut belajar?",
    answer:
      "Bisa! Peserta umum dapat mendaftar melalui jalur 'Peserta Umum' dengan membuat akun email, lalu memilih paket belajar yang tersedia dengan harga terjangkau.",
  },
  {
    question: "Bagaimana cara kerja skor di Game dan Papan Peringkat?",
    answer:
      "Setiap kali Anda menyelesaikan permainan bahasa Inggris (seperti Kuis Kilat, Word Match, atau Susun Kalimat) dalam sesi live yang dipandu pengajar, skor Anda otomatis dicatat ke papan peringkat. Bersaing secara sportif dan raih posisi terbaik!",
  },
];

export default function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(idx: number) {
    setOpenIndex(openIndex === idx ? null : idx);
  }

  return (
    <div className="space-y-3">
      {FAQ_LIST.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <article
            key={idx}
            className="rounded-xl border border-[#E5E7EB] bg-white transition overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-50"
            >
              <span className="text-base font-extrabold text-gray-900">{item.question}</span>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 transition-transform duration-200 ${
                  isOpen ? "rotate-180 bg-green-100 text-[#14532D]" : "text-gray-500"
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-[#E5E7EB] bg-gray-50/50 px-5 py-4">
                <p className="text-sm leading-relaxed text-gray-600">{item.answer}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}