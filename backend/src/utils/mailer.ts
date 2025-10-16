// import nodemailer from "nodemailer";
// import { env } from "../config/env.js";

// export const mailer = nodemailer.createTransport({
//   host: env.SMTP_HOST,
//   port: env.SMTP_PORT,
//   secure: Boolean(env.SMTP_SECURE), // true only for 465
//   auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
// });

// export function sendMail(opts: {
//   to: string;
//   subject: string;
//   html: string;
//   text?: string;
// }) {
//   return mailer.sendMail({
//     from: env.SMTP_FROM,
//     to: opts.to,
//     subject: opts.subject,
//     html: opts.html,
//     text: opts.text,
//   });
// }
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

// Safe coercions
const port = Number(env.SMTP_PORT ?? 587);
const secure = String(env.SMTP_SECURE).toLowerCase() === "true" || port === 465;

const hasAuth = !!(env.SMTP_USER && env.SMTP_PASS);

// Build transporter (auth optional for local dev servers like MailHog)
export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port,
  secure, // true for 465, false for others
  auth: hasAuth ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  // allow self-signed in dev if you set SMTP_ALLOW_SELF_SIGNED=true
  tls:
    String(env.SMTP_ALLOW_SELF_SIGNED).toLowerCase() === "true"
      ? { rejectUnauthorized: false }
      : undefined,
} as any);

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!env.SMTP_HOST) {
    // Helpful dev fallback: don't crash, but warn loudly.
    console.warn(
      "[mailer] SMTP not configured; skipping send. Set SMTP_* env vars to enable email."
    );
    return { accepted: [], rejected: [opts.to], skipped: true };
  }

  const from = env.SMTP_FROM || "no-reply@rapidero.com";
  return mailer.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
