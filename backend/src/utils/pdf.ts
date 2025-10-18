// src/utils/pdf.ts
import puppeteer from "puppeteer";

export async function htmlToPdfBuffer(
  html: string,
  opts?: { format?: string }
): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.emulateMediaType("screen");
    const buf = await page.pdf({
      format: (opts?.format as any) || "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return buf;
  } finally {
    await browser.close();
  }
}
