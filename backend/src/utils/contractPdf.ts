import { PDFDocument, StandardFonts } from "pdf-lib";

/**
 * Very small summary PDF for the contract. You can enhance layout later.
 */
export async function renderContractPdf(vm: {
  client: { client_name: string; client_code: string; email?: string | null };
  contract: {
    id: string;
    contract_code: string;
    agreement_date?: string | null;
    term_start?: string | null;
    term_end?: string | null;
    taxes_gst_pct?: number | null;
  };
}) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]); // A4 portrait
  const { height } = page.getSize();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = height - 60;
  const draw = (text: string, opts: { bold?: boolean } = {}) => {
    page.drawText(text, {
      x: 50,
      y,
      size: 12,
      font: opts.bold ? bold : font,
    });
    y -= 18;
  };

  draw("Rapidero Logistics — Contract", { bold: true });
  y -= 8;

  draw(`Contract Code: ${vm.contract.contract_code}`);
  draw(`Client: ${vm.client.client_name} (${vm.client.client_code})`);
  draw(`Agreement Date: ${vm.contract.agreement_date ?? "-"}`);
  draw(
    `Term: ${vm.contract.term_start ?? "-"} → ${vm.contract.term_end ?? "-"}`
  );
  draw(`GST (taxes_gst_pct): ${vm.contract.taxes_gst_pct ?? "-"}%`);
  y -= 10;
  draw("This is an automatically generated summary PDF.", { bold: true });

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
