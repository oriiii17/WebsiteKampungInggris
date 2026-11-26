import { NextResponse } from "next/server";
import { checkApiRateLimit, getRequestIp } from "@/lib/api-rate-limit";
import { sendCustomEmail } from "@/lib/email";

const WINDOW_MS = 60 * 60 * 1000;

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character] || character);
}

function validEmail(value: string) {
  return value.length <= 254 && !/[\r\n]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const ip = getRequestIp(request);
  const rate = checkApiRateLimit(`question:${ip}`, 3, WINDOW_MS);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Batas pengiriman tercapai. Coba lagi setelah satu jam." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Data pertanyaan tidak valid." }, { status: 400 });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const source = body.source === "faq" ? "faq" : "home";
  const honeypot = typeof body.website === "string" ? body.website : "";

  if (honeypot) return NextResponse.json({ ok: true });
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Nama harus berisi 2–120 karakter." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
  if (question.length < 5 || question.length > 1000) return NextResponse.json({ error: "Pertanyaan harus berisi 5–1000 karakter." }, { status: 400 });

  const inbox = process.env.CONTACT_INBOX_EMAIL?.trim() || process.env.SMTP_USER?.trim() || "";
  if (!validEmail(inbox)) return NextResponse.json({ error: "Layanan email belum siap. Silakan coba lagi nanti." }, { status: 503 });
  const subject = source === "faq" ? "Pertanyaan baru dari website (FAQ)" : "Pertanyaan baru dari website";
  const text = `Nama: ${name}\nEmail balasan: ${email}\nSumber: ${source === "faq" ? "Halaman FAQ" : "Beranda"}\n\nPertanyaan:\n${question}`;
  const html = `<main style="max-width:600px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;color:#26312a"><h1 style="font-size:22px">Pertanyaan baru dari website</h1><p><strong>Nama:</strong> ${escapeHtml(name)}</p><p><strong>Email balasan:</strong> ${escapeHtml(email)}</p><p><strong>Sumber:</strong> ${source === "faq" ? "Halaman FAQ" : "Beranda"}</p><p><strong>Pertanyaan:</strong></p><p style="white-space:pre-wrap;line-height:1.65">${escapeHtml(question)}</p></main>`;
  try {
    await sendCustomEmail({ to: inbox, replyTo: email, subject, text, html });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message === "Layanan email belum siap"
      ? "Layanan email belum siap. Silakan coba lagi nanti."
      : "Pertanyaan gagal dikirim. Coba lagi.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
