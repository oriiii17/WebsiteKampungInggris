#!/usr/bin/env node
try {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env.local");
  else {
    const fs = require("node:fs");
    const content = fs.readFileSync(".env.local", "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
      process.env[match[1]] = value;
    }
  }
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error("File .env.local tidak ditemukan.");
    process.exit(1);
  }
  if (!String(error?.message || "").includes("loadEnvFile")) {
    console.error("Gagal membaca konfigurasi .env.local.");
    process.exit(1);
  }
}

const nodemailer = require("nodemailer");

async function main() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME, SMTP_FROM_EMAIL } = process.env;
  const port = Number(SMTP_PORT);
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !SMTP_FROM_EMAIL || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Konfigurasi SMTP belum lengkap.");
  }
  const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, requireTLS: port === 587, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  await transporter.sendMail({
    from: `"${(SMTP_FROM_NAME || "Kampung Inggris Sapen").replace(/[\r\n"\\]/g, "")}" <${SMTP_FROM_EMAIL}>`,
    to: SMTP_USER,
    subject: "Uji email Kampung Inggris Sapen",
    text: "Email uji berhasil dikirim dari Kampung Inggris Sapen.",
    html: "<!doctype html><html lang=\"id\"><body style=\"margin:0;background:#f3ead8;font-family:Arial,sans-serif;color:#173c2e;padding:24px\"><main style=\"max-width:520px;margin:auto;background:#fffdf8;border:1px solid #dfd2bb;border-radius:16px;padding:28px\"><p role=\"img\" aria-label=\"Kampung Inggris Sapen\" style=\"font-family:Georgia,serif;font-size:20px;font-weight:bold\">Kampung Inggris Sapen</p><h1>Email uji berhasil</h1><p>Email uji ini dikirim ke alamat SMTP yang dikonfigurasi.</p></main></body></html>",
  });
  console.log("Email uji berhasil dikirim ke SMTP_USER.");
}

main().catch(() => {
  console.error("Email uji gagal. Periksa konfigurasi SMTP tanpa membagikan nilainya.");
  process.exitCode = 1;
});
