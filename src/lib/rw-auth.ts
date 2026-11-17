/**
 * rw-auth.ts
 * Logika autentikasi warga Kampung Sapen berdasarkan kode per RW.
 * Satu kode untuk seluruh warga satu RW (RW 06 / RW 07 / RW 08).
 */

import crypto from "crypto";
import { RwCode } from "./types";

// ── Daftar kata kasar sederhana (diperluas admin jika perlu) ──
const KATA_KASAR = ["bangsat", "anjing", "babi", "kontol", "memek", "tolol", "idiot", "goblok"];

// ── In-memory rate limiter: IP → { count, resetAt } ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 menit

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  if (rateLimitMap.size > 5000) {
    for (const [key, bucket] of rateLimitMap) if (bucket.resetAt <= now) rateLimitMap.delete(key);
  }
  if (rateLimitMap.size >= 5000 && !rateLimitMap.has(ip)) {
    const oldestKey = rateLimitMap.keys().next().value as string | undefined;
    if (oldestKey) rateLimitMap.delete(oldestKey);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
}

/** Normalkan kode RW: hapus tanda hubung, ubah ke uppercase, tambahkan kembali tanda hubung */
export function normalizeRwCode(raw: string): string {
  const stripped = raw.replace(/[-\s]/g, "").toUpperCase();
  if (stripped.length === 6) {
    return `${stripped.slice(0, 3)}-${stripped.slice(3)}`;
  }
  return stripped;
}

/** Hash kode untuk disimpan di DB */
export function hashRwCode(code: string): string {
  return crypto.createHash("sha256").update(code.toUpperCase()).digest("hex");
}

/** Verifikasi kode yang diinput dengan hash di DB */
export function verifyRwCode(input: string, storedHash: string): boolean {
  const normalInput = normalizeRwCode(input);
  const inputHash = hashRwCode(normalInput);
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(storedHash, "hex"));
}

/** Validasi nama panggilan */
export function validateNamaPanggilan(nama: string): { valid: boolean; error?: string } {
  const trimmed = nama.trim();
  if (trimmed.length === 0) return { valid: false, error: "Nama panggilan tidak boleh kosong." };
  if (trimmed.length < 3) return { valid: false, error: "Nama panggilan minimal 3 karakter. Contoh: Budi, Ibu Ani." };
  if (trimmed.length > 20) return { valid: false, error: "Nama panggilan maksimal 20 karakter." };
  if (!/^[\w\s\u00C0-\u024F]+$/u.test(trimmed)) {
    return { valid: false, error: "Nama hanya boleh mengandung huruf, angka, dan spasi." };
  }
  const lower = trimmed.toLowerCase();
  for (const kata of KATA_KASAR) {
    if (lower.includes(kata)) {
      return { valid: false, error: "Nama panggilan mengandung kata yang tidak pantas. Silakan ganti." };
    }
  }
  return { valid: true };
}

/** Cari kode RW yang cocok dari daftar rwCodes */
export function findMatchingRw(inputCode: string, rwCodes: RwCode[]): RwCode | null {
  const normalized = normalizeRwCode(inputCode);
  for (const rw of rwCodes) {
    if (!rw.isActive) continue;
    if (verifyRwCode(normalized, rw.codeHash)) return rw;
  }
  return null;
}

/** Generate kode RW acak format XXX-XXX */
export function generateRwCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    if (i === 3) code += "-";
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

/** Buat RwCode record baru dengan hash */
export function createRwCodeRecord(
  rw: "RW 06" | "RW 07" | "RW 08",
  plainCode: string,
  id = `rw-${rw.replace("RW ", "")}-${Date.now()}`
): RwCode {
  const display = normalizeRwCode(plainCode);
  return {
    id,
    rw,
    codeHash: hashRwCode(display),
    codeDisplay: display,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };
}

