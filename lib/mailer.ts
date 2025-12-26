import nodemailer from "nodemailer";
import { sendAccessEmail as sendAccessEmailSmtp } from "@/lib/mailer";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getMailer() {
  const host = env("SMTP_HOST");
  const port = Number(env("SMTP_PORT"));
  const user = env("SMTP_USER");
  const pass = env("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
    // Für 587: STARTTLS wird automatisch genutzt, wenn secure=false
  });
}

export async function sendAccessEmail(to: string, code: string) {
  const transporter = getMailer();
  const from = env("MAIL_FROM");

  const subject = "Dein Zugangscode – Hausaufgabenhelfer";
  const appUrl = "https://hausaufgaben-was-ist-das.vercel.app/start";

  const text = `Vielen Dank für deinen Kauf!

Dein Zugangscode:
${code}

App öffnen:
${appUrl}

Dann Code eingeben → Weiter → fertig.
`;

  await transporter.sendMail({ from, to, subject, text });
}
