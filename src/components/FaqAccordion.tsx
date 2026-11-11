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
    <div className="border-y border-rule-strong">
      {FAQ_LIST.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <article
            key={idx}
            className="border-b border-rule last:border-b-0 transition"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              className="flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left transition hover:text-earth"
            >
              <span className="text-base font-extrabold text-ink">{item.question}</span>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center border transition-transform duration-200 ${
                  isOpen ? "rotate-180 border-leaf bg-leaf text-white" : "border-rule bg-paper text-leaf"
                }`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>
            {isOpen && (
              <div className="max-w-3xl pb-5 pr-10">
                <p className="text-sm leading-7 text-body">{item.answer}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
