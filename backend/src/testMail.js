// D:\Rapidero\backend\src\testMail.js
import { mailer, sendMail } from "./utils/mailer.js"; // note the .js extension (ESM)

async function main() {
  try {
    console.log("🔎 Verifying SMTP connection...");
    await mailer.verify();
    console.log("✅ SMTP connection OK");

    await sendMail({
      to: "kanyalpriyanshu@gmail.com",
      subject: "SMTP Test - Rapidero Logistics",
      html: "<h2>Hello from Rapidero Logistics!</h2><p>This is a test email.</p>",
      text: "Hello from Rapidero Logistics! This is a test email.",
    });

    console.log("📨 Test email sent successfully.");
  } catch (err) {
    console.error("❌ SMTP test failed:", err);
  }
}

main();
