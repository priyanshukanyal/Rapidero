// src/modules/invoices/templates/invoice.html.ts

export function renderInvoiceHTML(vm: {
  invoice: any;
  client: any;
  contract: any;
  lines: any[];
}): string {
  const { invoice, client, lines } = vm;

  const rowsHtml = lines
    .map(
      (l, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${l.cn_number}</td>
        <td>${l.booking_date ?? ""}</td>
        <td>${l.origin_city ?? ""}</td>
        <td>${l.dest_city ?? ""}</td>
        <td style="text-align:right">${l.actual_weight_kg ?? ""}</td>
        <td style="text-align:right">${l.charged_weight_kg ?? ""}</td>
        <td style="text-align:right">${l.rate_per_kg?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.basic_freight?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.docket_charge?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.fov_amount?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.fsc_amount?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.oda_charge?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.green_tax?.toFixed?.(2) ?? ""}</td>
        <td style="text-align:right">${l.line_total?.toFixed?.(2) ?? ""}</td>
      </tr>
    `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
        h1,h2,h3,h4 { margin: 0; padding: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; }
        th { background: #f2f2f2; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <h2>Rapidero Logistics</h2>
      <h3>Invoice: ${invoice.invoice_number}</h3>

      <table style="margin-top: 8px">
        <tr>
          <td>
            <strong>Billed To:</strong><br/>
            ${client.client_name ?? ""}<br/>
            ${client.billing_address ?? client.address_line1 ?? ""}<br/>
            ${client.city ?? ""} ${client.postcode ?? ""}<br/>
          </td>
          <td>
            <strong>Invoice Period:</strong><br/>
            ${invoice.billing_start} to ${invoice.billing_end}<br/>
            <strong>Created:</strong> ${invoice.created_at}<br/>
          </td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Cnote No.</th>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Act Wt</th>
            <th>Chg Wt</th>
            <th>Rate</th>
            <th>Freight</th>
            <th>Docket</th>
            <th>FOV</th>
            <th>FSC</th>
            <th>ODA</th>
            <th>Green Tax</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <table style="margin-top: 12px; width: 50%; margin-left: auto">
        <tr>
          <td><strong>Total Freight</strong></td>
          <td class="text-right">${
            invoice.total_basic_freight?.toFixed?.(2) ?? ""
          }</td>
        </tr>
        <tr>
          <td><strong>Total FOV</strong></td>
          <td class="text-right">${invoice.total_fov?.toFixed?.(2) ?? ""}</td>
        </tr>
        <tr>
          <td><strong>Total FSC</strong></td>
          <td class="text-right">${invoice.total_fsc?.toFixed?.(2) ?? ""}</td>
        </tr>
        <tr>
          <td><strong>Total ODA</strong></td>
          <td class="text-right">${invoice.total_oda?.toFixed?.(2) ?? ""}</td>
        </tr>
        <tr>
          <td><strong>Total Green Tax</strong></td>
          <td class="text-right">${
            invoice.total_green_tax?.toFixed?.(2) ?? ""
          }</td>
        </tr>
        <tr>
          <td><strong>Grand Total</strong></td>
          <td class="text-right"><strong>${
            invoice.grand_total?.toFixed?.(2) ?? ""
          }</strong></td>
        </tr>
      </table>

      <p style="margin-top: 20px; font-size: 10px;">
        This is a system generated invoice from Rapidero Logistics.
      </p>
    </body>
  </html>
  `;
}
