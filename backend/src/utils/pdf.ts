// src/utils/pdf.ts
import pdf from "html-pdf";

/**
 * Render HTML → PDF buffer using `html-pdf`.
 * No Chrome / Puppeteer needed, works well on servers.
 */
export function htmlToPdfBuffer(
  html: string,
  _opts?: { format?: string }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const options = {
      format: "A4",
      border: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
      // You can tweak things like orientation, timeout, etc. here if needed
      // orientation: "portrait",
      // timeout: 60000,
    } as any;

    (pdf as any).create(html, options).toBuffer((err: any, buffer: Buffer) => {
      if (err) {
        console.error("htmlToPdfBuffer error:", err);
        return reject(err);
      }
      resolve(buffer);
    });
  });
}
