"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

export const HOME_FAQ_LIST: FaqItem[] = [
  {
    question: "Bagaimana cara mendapatkan Kode Akses?",
    answer: "Kode Akses hanya diberikan kepada warga Sapen. Jika Anda adalah warga Sapen dan belum memilikinya, silakan hubungi pengelola program atau pengurus setempat untuk verifikasi.",
  },
  {
    question: "Bagaimana jika saya bukan warga Sapen dan tidak punya Kode Akses?",
    answer: "Tidak masalah. Anda tetap bisa bergabung sebagai peserta umum dengan membuat akun langsung di website ini tanpa perlu memasukkan Kode Akses warga.",
  },
  {
    question: "Apakah masyarakat umum di luar Sapen bisa ikut belajar?",
    answer: "Tentu saja. Website ini terbuka untuk umum. Anda cukup membuat akun melalui menu Daftar untuk mengakses latihan mandiri atau memilih program kelas yang tersedia.",
  },
];

export const FAQ_LIST: FaqItem[] = [
  {
    question: "Siapa saja yang berhak mendapatkan Kode Akses?",
    answer: "Kode Akses diberikan khusus bagi warga Kampung Sapen (RW 06, RW 07, dan RW 08) yang terdaftar. Silakan hubungi pengelola program atau pengurus di lingkungan Sapen untuk mendapatkan kode akses Anda.",
  },
  {
    question: "Bagaimana cara menggunakan Kode Akses?",
    answer: "Buka halaman Masuk, pilih tab Kode Akses, lalu masukkan enam karakter kode yang Anda terima dari pengelola. Sistem akan mengenali wilayah RW Anda secara otomatis.",
  },
  {
    question: "Bagaimana ketentuan biaya belajar di website ini?",
    answer: "Seluruh fitur dan program belajar 100% gratis bagi warga Sapen yang menggunakan Kode Akses resmi. Bagi peserta umum, tersedia fitur latihan gratis serta pilihan kelas berbayar yang dapat didaftarkan melalui katalog kelas.",
  },
  {
    question: "Apakah warga Sapen harus membuat akun dengan email dan kata sandi?",
    answer: "Tidak perlu! Warga Sapen cukup masuk menggunakan Kode Akses resmi untuk wilayah RW 06, RW 07, atau RW 08 tanpa perlu mendaftarkan email maupun kata sandi.",
  },
  {
    question: "Saya berasal dari luar wilayah Sapen, apakah tetap bisa ikut belajar?",
    answer: "Tentu bisa! Peserta umum dapat mendaftar akun menggunakan email, lalu memilih kelas yang diinginkan dari katalog dan menyelesaikannya melalui keranjang.",
  },
  {
    question: "Bagaimana proses pembayaran dan aktivasi kelas untuk peserta umum?",
    answer: "Pilih kelas, masukkan ke keranjang, lalu selesaikan pesanan. Kelas akan langsung aktif di menu Kelas Saya.",
  },
  {
    question: "Bagaimana cara kerja skor pada Kuis dan Papan Peringkat?",
    answer: "Setiap kali Anda menyelesaikan kuis Bahasa Inggris (seperti Kuis Kilat, Word Match, atau Susun Kalimat) dalam sesi langsung bersama pengajar, skor Anda otomatis tercatat di papan peringkat.",
  },
];

export default function FaqAccordion({ items = FAQ_LIST }: { items?: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(idx: number) {
    setOpenIndex(openIndex === idx ? null : idx);
  }

  return (
    <div className="faq-accordion">
      {items.map((item, idx) => {
        const isOpen = openIndex === idx;
        return (
          <article
            key={idx}
            className="faq-item"
          >
            <button
              type="button"
              onClick={() => toggle(idx)}
              aria-expanded={isOpen}
              aria-controls={`faq-answer-${idx}`}
              id={`faq-question-${idx}`}
            className="faq-trigger flex min-h-16 w-full items-center justify-between gap-4 py-5 text-left transition"
            >
              <span className="text-base font-extrabold">{item.question}</span>
              <div
                aria-hidden="true"
                className={`faq-chevron flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 ${isOpen ? "is-open" : ""}`}
              >
                <ChevronDown className="h-4 w-4" />
              </div>
            </button>
            <div
              id={`faq-answer-${idx}`}
              role="region"
              aria-labelledby={`faq-question-${idx}`}
              hidden={!isOpen}
              className="faq-panel max-w-3xl pb-5 pr-10"
            >
              <p className="text-sm leading-7 text-body">{item.answer}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
