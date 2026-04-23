import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatCurrencyCl } from "@/lib/format";

export type SalesPdfRow = {
  title: string;
  price: number;
  status: string;
};

export function buildSalesPdfDataUri(rows: SalesPdfRow[]): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 65, 104);
  doc.text("Reporte de publicaciones de venta", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 95, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [["Título", "Precio", "Estado"]],
    body: rows.map((r) => [r.title, formatCurrencyCl(r.price), r.status]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [31, 65, 104], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  return doc.output("datauristring");
}

export function buildSaleReceiptPdfDataUri(row: {
  id: string;
  title: string;
  inventoryItemId: string;
  salePrice: number;
  status: string;
}): string {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 65, 104);
  doc.text("Comprobante de venta", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);

  const rows = [
    ["ID venta", row.id],
    ["Título", row.title],
    ["Item inventario", row.inventoryItemId],
    ["Precio", formatCurrencyCl(row.salePrice)],
    ["Estado", row.status],
    ["Fecha emisión", new Date().toLocaleString("es-CL")]
  ];

  autoTable(doc, {
    startY: 28,
    head: [["Campo", "Valor"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [31, 65, 104], textColor: 255, fontStyle: "bold" },
    margin: { left: 14, right: 14 }
  });

  return doc.output("datauristring");
}
