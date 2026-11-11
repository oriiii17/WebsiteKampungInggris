"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  QrCode,
  X,
} from "lucide-react";
import { SessionPayload, SubscriptionPlan, SubscriptionRecord } from "@/lib/types";

interface Props {
  plans: SubscriptionPlan[];
  session: SessionPayload | null;
}

const PAYMENT_CHANNELS = [
  { id: "QRIS", label: "QRIS (GoPay, OVO, Dana, ShopeePay, M-Banking)", badge: "Instan" },
  { id: "BCA Virtual Account", label: "BCA Virtual Account", badge: "Otomatis" },
  { id: "BRI Virtual Account", label: "BRI Virtual Account (BRIVA)", badge: "Otomatis" },
  { id: "Mandiri Virtual Account", label: "Mandiri Bill Payment", badge: "Otomatis" },
];

export default function SubscriptionCheckoutClient({ plans, session }: Props) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || "");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_CHANNELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment Simulator Modal State
  const [activeOrder, setActiveOrder] = useState<SubscriptionRecord | null>(null);
  const [confirming, setConfirming] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  async function handleCheckout() {
    if (!session) {
      router.push("/masuk?tab=umum");
      return;
    }
    if (session.origin === "warga_kode") {
      setError(
        "Anda sudah masuk menggunakan Kode Akses Warga Sapen (Gratis) — tidak perlu membayar paket!"
      );
      return;
    }
    if (!session.email) {
      router.push("/masuk?tab=umum");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal membuat transaksi.");
        setLoading(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      setActiveOrder(data.order);
      setLoading(false);
    } catch {
      setError("Terjadi gangguan koneksi.");
      setLoading(false);
    }
  }

  async function handleSimulatePaid() {
    if (!activeOrder) return;
    setConfirming(true);
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrder.orderId,
          transaction_status: "paid_simulation",
          paymentMethod,
        }),
      });
      if (res.ok) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        setActiveOrder(null);
        router.push("/modul");
        router.refresh();
      }
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div>
      {/* Plan Cards: Putih bersih, border #E5E7EB, tanpa gradient */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isPicked = plan.id === selectedPlanId;
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`cursor-pointer rounded-xl border p-6 transition ${
                isPicked
                  ? "border-[#14532D] bg-white ring-1 ring-[#14532D]"
                  : "border-[#E5E7EB] bg-white hover:border-gray-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">{plan.name}</span>
                {plan.badge && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-gray-900">
                  Rp {plan.priceIdr.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-gray-500">
                  / {plan.durationDays} hari aktif
                </span>
              </div>

              <p className="mt-2 text-sm text-gray-600 leading-[1.6]">
                {plan.description}
              </p>

              <ul className="mt-4 pt-4 border-t border-[#E5E7EB] space-y-2 text-xs text-gray-700">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#14532D]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Metode Pembayaran: Clean, Border #E5E7EB */}
      <div className="mt-8 rounded-xl border border-[#E5E7EB] bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <CreditCard className="h-4 w-4 text-[#14532D]" />
          Pilih Metode Pembayaran
        </h2>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_CHANNELS.map((ch) => {
            const active = paymentMethod === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setPaymentMethod(ch.id)}
                className={`flex items-center justify-between rounded-lg border p-3.5 text-left transition ${
                  active
                    ? "border-[#14532D] bg-gray-50 text-gray-900"
                    : "border-[#E5E7EB] bg-white hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {ch.id === "QRIS" ? (
                    <QrCode className="h-4 w-4 text-[#14532D]" />
                  ) : (
                    <Building2 className="h-4 w-4 text-[#14532D]" />
                  )}
                  <span className="text-xs font-semibold">{ch.label}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  {ch.badge}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
            {error}
          </div>
        )}

        {/* Tombol Utama: Aksen Kuning #F59E0B */}
        <div className="mt-6 pt-6 border-t border-[#E5E7EB] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Total Pembayaran:</p>
            <p className="text-2xl font-extrabold text-gray-900">
              Rp {selectedPlan?.priceIdr.toLocaleString("id-ID")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-gray-950 px-6 py-3 text-sm font-bold transition"
          >
            {!session
              ? "Daftar Akun & Lanjut Bayar"
              : loading
              ? "Memproses Pembayaran..."
              : "Bayar & Aktifkan Paket"}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Warga Kampung Sapen?{" "}
          <Link href="/masuk?tab=warga" className="font-bold text-[#14532D] underline">
            Masuk dengan Kode Akses Warga (Gratis)
          </Link>
        </p>
      </div>

      {/* SIMULATOR MODAL */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white border border-[#E5E7EB] shadow-lg">
            <div className="flex items-center justify-between bg-gray-50 border-b border-[#E5E7EB] px-5 py-3.5">
              <div>
                <p className="text-xs font-bold text-[#14532D]">Simulasi Pembayaran</p>
                <h3 className="text-sm font-bold text-gray-900">{activeOrder.planName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="rounded p-1 text-gray-400 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 text-center">
              <p className="text-xs text-gray-500">
                Order ID: <span className="font-mono">{activeOrder.orderId}</span>
              </p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">
                Rp {activeOrder.amountIdr.toLocaleString("id-ID")}
              </p>
              <span className="mt-2 inline-block rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                Metode: {paymentMethod}
              </span>

              {paymentMethod === "QRIS" ? (
                <div className="mx-auto my-4 flex h-40 w-40 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
                  <QrCode className="h-24 w-24 text-gray-800" />
                  <span className="mt-1.5 text-[10px] text-gray-500">
                    QRIS Kampung Sapen
                  </span>
                </div>
              ) : (
                <div className="my-4 rounded-lg border border-[#E5E7EB] bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Nomor Virtual Account:</p>
                  <p className="mt-1 font-mono text-lg font-bold text-gray-900">
                    8801 9283 7741 2026
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 mb-4">
                Klik tombol di bawah ini untuk mensimulasikan status lunas otomatis.
              </p>

              <button
                type="button"
                onClick={handleSimulatePaid}
                disabled={confirming}
                className="w-full rounded-lg bg-[#14532D] hover:bg-[#0F3F22] py-2.5 text-xs font-bold text-white transition"
              >
                {confirming ? "Mengaktifkan Paket..." : "Konfirmasi Pembayaran Lunas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
