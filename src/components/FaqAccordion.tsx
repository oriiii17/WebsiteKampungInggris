"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_LIST: FaqItem[] = [
  {
    question: "Bagaimana cara mendapatkan Kode Akses untuk belajar gratis?",
    answer:
      "Kode Akses dibagikan langsung oleh pengelola program kepada peserta yang terdaftar. Silakan hubungi pengelola program belajar di lingkungan Anda untuk mendapatkan kode akses tersebut.",
  },
  {
    question: "Bagaimana cara memakai Kode RW?",
    answer: "Buka halaman Masuk, pilih Kode Akses, lalu masukkan enam karakter kode dari pengelola. Sistem akan mengenali RW secara otomatis.",
  },
  {
    question: "Apakah website ini benar-benar gratis?",
    answer:
      "Ya, peserta yang memiliki Kode Akses resmi dari pengelola program dapat menggunakan seluruh fitur platform ini 100% gratis — tanpa biaya dan tanpa kartu kredit.",
  },
  {
    question: "Apakah saya harus memasukkan email dan kata sandi untuk belajar?",
    answer:
      "Tidak perlu! Warga cukup memasukkan kode khusus wilayah RW 06, RW 07, atau RW 08. Tanpa nama, email, atau kata sandi.",
  },
  {
    question: "Apakah platform ini bisa dibuka melalui HP?",
    answer:
      "Tentu saja! Website ini dirancang mobile-first sehingga sangat ringan, nyaman dibuka melalui smartphone, tablet, maupun laptop di browser apa pun tanpa perlu menginstal aplikasi tambahan.",
  },
  {
    question: "Saya dari luar komunitas, apakah tetap bisa ikut belajar?",
    answer:
      "Bisa! Peserta umum dapat membuat akun email, lalu memilih satu atau beberapa kelas individual dari katalog dan mendaftar melalui keranjang.",
  },
  {
    question: "Bagaimana cara mendaftar kelas?",
    answer: "Buat akun peserta melalui halaman Daftar, pilih kelas yang diinginkan, lalu tambahkan ke keranjang. Pendaftaran berbayar akan tersedia setelah pembayaran otomatis dibuka.",
  },
  {
    question: "Bagaimana cara membayar kelas?",
    answer: "Pembayaran otomatis saat ini belum dibuka. Pengurus dapat memberikan akses kelas secara manual; informasi pembayaran akan ditampilkan setelah fitur pembayaran tersedia.",
  },
  {
    question: "Bagaimana cara masuk ke kelas yang sudah dipilih?",
    answer: "Masuk dengan akun peserta yang digunakan saat mendaftar. Kelas yang sudah diberikan ke akun Anda dapat dibuka dari halaman Kelas.",
  },
  {
    question: "Bagaimana cara kerja skor di Game dan Papan Peringkat?",
    answer:
      "Setiap kali Anda menyelesaikan permainan bahasa Inggris (seperti Kuis Kilat, Word Match, atau Susun Kalimat) dalam sesi live yang dipandu pengajar, skor Anda otomatis dicatat ke papan peringkat. Bersaing secara sportif dan raih posisi terbaik!",
  },
];

export default function FaqAccordion({ limit }: { limit?: number }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const items = typeof limit === "number" ? FAQ_LIST.slice(0, limit) : FAQ_LIST;

  function toggle(idx: number) {
    setOpenIndex(openIndex === idx ? null : idx);
  }

  return (
    <div className="border-y border-rule-strong">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <article
            key={idx}
            className="border-b border-rule last:border-b-0 transition"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${idx}`}
              id={`faq-question-${idx}`}
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
            <div
              id={`faq-answer-${idx}`}
              role="region"
              aria-labelledby={`faq-question-${idx}`}
              hidden={!isOpen}
              className="max-w-3xl pb-5 pr-10"
            >
              <p className="text-sm leading-7 text-body">{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
