import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: Boolean(env.SMTP_SECURE), // true only for 465
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  return mailer.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
