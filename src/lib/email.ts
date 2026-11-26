import "server-only";
import nodemailer from "nodemailer";

type EmailOptions = { to: string; subject: string; heading: string; intro: string; actionUrl: string; actionLabel: string; note?: string };

type CustomEmailOptions = { to: string; replyTo: string; subject: string; text: string; html: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT?.trim());
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.SMTP_FROM_EMAIL?.trim();
  if (!host || !/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass || !fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
    throw new Error("Layanan email belum siap");
  }
  return { host, port, user, pass, fromEmail };
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
    const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
    const safeContact = contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) ? escapeHtml(contactEmail) : "";
    const contactFooter = safeContact ? `<p style="margin:20px 0 0;color:#595f5a;font-size:12px;line-height:1.6">Butuh bantuan? <a href="mailto:${safeContact}" style="color:#1f4d3a">${safeContact}</a></p>` : "";
    const plainText = `${options.heading}\n\n${options.intro}\n\n${options.actionLabel}: ${options.actionUrl}\n\nJika tombol tidak bisa dibuka, salin tautan di atas ke browser.${options.note ? `\n\n${options.note}` : ""}${safeContact ? `\n\nButuh bantuan? Hubungi ${contactEmail}` : ""}\n\nJika Anda tidak meminta email ini, abaikan pesan ini.`;
    await transporter.sendMail({
      from: `"Kampung Inggris Sapen" <${config.fromEmail}>`,
      replyTo: safeContact || config.fromEmail,
      to: options.to,
      subject: options.subject,
      text: plainText,
      html: `<!doctype html><html lang="id"><body style="margin:0;padding:24px 12px;background:#ffffff;font-family:Arial,sans-serif;color:#343b36"><main style="box-sizing:border-box;width:100%;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e2e7e3;border-radius:16px"><p style="margin:0 0 24px;font-family:Georgia,serif;font-size:21px;font-weight:bold;color:#1f4d3a">Kampung Inggris Sapen</p><h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#26312a">${heading}</h1><p style="margin:0;color:#454c47;font-size:16px;line-height:1.7">${intro}</p><p style="margin:28px 0 20px"><a href="${safeUrl}" aria-label="${label} — Kampung Inggris Sapen" style="display:inline-block;padding:16px 26px;border-radius:10px;background:#1f4d3a;color:#ffffff;font-weight:bold;text-decoration:none">${label}</a></p><p style="margin:0;color:#555d57;font-size:14px;line-height:1.6">Jika tombol tidak bisa dibuka, salin tautan ini ke browser:<br><a href="${safeUrl}" style="color:#1f4d3a;word-break:break-word">${safeUrl}</a></p>${note}${contactFooter}<p style="margin:24px 0 0;color:#68716b;font-size:12px;line-height:1.6">Jika Anda tidak meminta email ini, abaikan pesan ini.</p></main></body></html>`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Layanan email belum siap") throw error;
    throw new Error("Email belum dapat dikirim. Periksa konfigurasi layanan email.");
  }
}

export async function sendCustomEmail(options: CustomEmailOptions) {
  try {
    const config = smtpConfig();
    const validEmail = (value: string) => /^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(value);
    if (!validEmail(options.to) || !validEmail(options.replyTo) || /[\r\n]/.test(options.subject)) {
      throw new Error("Alamat email tidak valid.");
    }
    const transporter = nodemailer.createTransport({ host: config.host, port: config.port, secure: config.port === 465, requireTLS: config.port === 587, auth: { user: config.user, pass: config.pass } });
    await transporter.sendMail({
      from: `"Kampung Inggris Sapen" <${config.fromEmail}>`,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Layanan email belum siap") throw error;
    if (error instanceof Error && error.message === "Alamat email tidak valid.") throw error;
    throw new Error("Pertanyaan belum dapat dikirim. Coba lagi nanti.");
  }
}
