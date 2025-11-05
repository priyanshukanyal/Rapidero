// src/utils/pdf.ts
import puppeteer from "puppeteer";

/**
 * Render HTML → PDF buffer reliably across local/dev/prod.
 * - handles slow fonts/CSS (waits for fonts & network idle)
 * - works in Docker/CI with no-sandbox flags
 * - longer default timeout to avoid 30s navigation timeouts
 */
export async function htmlToPdfBuffer(
  html: string,
  opts?: { format?: string }
): Promise<Buffer> {
  // Use stable "headless: true" (not "new") + flags for server environments
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--font-render-hinting=none",
      "--disable-gpu",
      "--no-zygote",
    ],
  });

  try {
    const page = await browser.newPage();
    // Bump timeouts so large pages don’t bail out early
    page.setDefaultNavigationTimeout(120_000);
    page.setDefaultTimeout(120_000);

    // Using data: URL avoids navigation race conditions
    const dataUrl = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    await page.goto(dataUrl, { waitUntil: "domcontentloaded" });

    // Ensure styles/metrics are ready
    await page.evaluateHandle("document.fonts && document.fonts.ready");
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 30_000 }).catch(
      () => {} // ignore if already idle
    );

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
