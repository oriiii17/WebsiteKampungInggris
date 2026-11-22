import "server-only";
import nodemailer from "nodemailer";

type EmailOptions = { to: string; subject: string; heading: string; intro: string; actionUrl: string; actionLabel: string; note?: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT?.trim());
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || "Kampung Inggris Sapen";
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  if (!host || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new Error("Layanan email belum siap");
  }
  return { host, port, user, pass, fromName, fromEmail };
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character] || character);
}

export async function sendAppEmail(options: EmailOptions) {
  try {
    const config = smtpConfig();
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port === 587, auth: { user: config.user, pass: config.pass } });
    const heading = escapeHtml(options.heading);
    const intro = escapeHtml(options.intro);
    const label = escapeHtml(options.actionLabel);
    const note = options.note ? `<p style="margin:24px 0 0;color:#685f54;font-size:14px;line-height:1.6">${escapeHtml(options.note)}</p>` : "";
    const safeUrl = escapeHtml(options.actionUrl);
    await transporter.sendMail({
      from: `"${config.fromName.replace(/[\r\n"\\]/g, "")}" <${config.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: `${options.heading}\n\n${options.intro}\n\n${options.actionLabel}: ${options.actionUrl}${options.note ? `\n\n${options.note}` : ""}`,
      html: `<!doctype html><html lang="id"><body style="margin:0;background:#f3ead8;font-family:Arial,sans-serif;color:#173c2e"><main style="max-width:560px;margin:32px auto;padding:32px 24px;background:#fffdf8;border:1px solid #dfd2bb;border-radius:18px"><p role="img" aria-label="Kampung Inggris Sapen" style="margin:0 0 24px;font-family:Georgia,serif;font-size:21px;font-weight:bold;color:#173c2e">Kampung Inggris Sapen</p><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:28px;line-height:1.2">${heading}</h1><p style="margin:0;color:#514b42;font-size:16px;line-height:1.7">${intro}</p><p style="margin:28px 0"><a href="${safeUrl}" aria-label="${label} — Kampung Inggris Sapen" style="display:inline-block;padding:15px 24px;border-radius:10px;background:#b9442d;color:#fff;font-weight:bold;text-decoration:none">${label}</a></p>${note}<p style="margin:28px 0 0;color:#766e62;font-size:12px;line-height:1.6">Jika tombol tidak bisa dibuka, salin tautan di atas ke browser. Jika Anda tidak meminta email ini, abaikan pesan ini.</p></main></body></html>`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Layanan email belum siap") throw error;
    throw new Error("Email belum dapat dikirim. Periksa konfigurasi layanan email.");
  }
}
