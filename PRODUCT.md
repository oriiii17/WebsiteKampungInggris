# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 15.3.0 (App Router), TypeScript 5.7.3, React 19.0.0, Tailwind CSS 3.4.17, Lucide React 0.475.0, page-flip 2.0.7, pdfjs-dist 4.10.38, jszip 3.10.2, canvas-confetti 1.9.3, SSE streaming, Web Audio API, file-based JSON database (.data/db.json) with Supabase optional.

## Users

- **Pengurus/Developer** (primary for admin features): manage classes, upload PDFs, create quiz banks, monitor participants, verify access codes, moderate reviews.
- **Warga Kampung Sapen** (RW 06, 07, 08): free full access via nickname + access code, no email/password.
- **Anak-anak & Pelajar** (SD-SMA): vocabulary games, telling time, live classroom quizzes.
- **Peserta Umum**: self-enrollment via email + full name, structured classes with payment.
- **Peserta KKN & Pengajar Relawan**: host live quizzes on projector/laptop while students answer on phones.

## Product Purpose

Sapen English is a mobile-first English learning platform for Kampung Sapen (Yogyakarta) that closes the gap in quality foreign-language access through digital reading modules (flipbook), self-paced exercises, and real-time interactive classroom quizzes (Kahoot-style).

## Positioning

Combines a protected 3D flipbook reader with signed-HMAC page URLs, a live SSE quiz engine with no third-party dependency, and a dual login path (RW access codes vs. email registration) — a community-grade platform that behaves like a commercial product.

## Operating Context

- Admin panel used on desktop/laptop with projector output for live quiz hosting.
- Students answer on their own phones; touch targets must be ≥44px.
- PDF modules uploaded by admin through browser, converted client-side to WebP pages.
- Local JSON database with safe locking; Supabase cloud sync planned but not active.
- Midtrans payment gateway integration built but disabled (feature flag `PAYMENT_ENABLED = false`).

## Capabilities and Constraints

- Signed HMAC-SHA256 URLs protect all module page images with TTL.
- HTTP-only session cookies with automatic expiry.
- CSS `@media print` protection and auto-watermark on documents.
- Admin access restricted to `pengurus@kampungsapen.id` and `dev@kampungsapen.id`.
- Design system locked: primary `#14532D`, accent `#F59E0B`, font Nunito, Lucide React icons only.
- One feature per session; do not touch unrelated files or change existing colors/fonts/design.

## Brand Commitments

- Name: Sapen English (Platform Pembelajaran Bahasa Inggris Komunitas Kampung Sapen).
- Voice: warm, community-rooted, professional, mobile-first.
- Visual identity: Forest Green + Amber palette, Nunito rounded typography, Lucide vector icons.
- Anti-references: no purple/blue neon gradients, no excessive glassmorphism, no AI-template aesthetics.

## Evidence on Hand

- `PROJECT-STATUS.md` — full project documentation, completed features (1–14), incomplete features (1–6), design system, run instructions.
- `.data/db.json` — local database with modules, classes, codes, testimonials.
- Source tree under `src/app/`, `src/components/`, `src/lib/`.

## Product Principles

1. Mobile-first: every touch target ≥44px, responsive hamburger drawer, bottom nav on phones.
2. Community access first: RW users get 100% free access with nickname + access code.
3. Security by default: signed URLs, HTTP-only cookies, print protection, watermarking.
4. One feature per session; never rewrite stable, working components.
5. Preserve the existing design system exactly — no new colors, fonts, or visual styles.

## Accessibility & Inclusion

- Touch targets sized for phone thumbs (min-h-[44px]).
- Text-to-Speech for reading modules to support varying literacy levels.
- Structured headings and semantic HTML for screen reader compatibility.