import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { formatIntegerCl } from "@/lib/format";

export type InventoryPdfRow = { name: string; stock: number; sold: number };

/**
 * PDF de inventario: producto, stock y cantidad vendida (nº de publicaciones de venta por ítem).
 */
export function buildInventoryStockSoldPdfBase64(rows: InventoryPdfRow[]): string {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, "es"));

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(31, 65, 104);
  doc.text("Reporte de inventario y ventas", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 95, 120);
  doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, 14, 26);
  doc.text(
    "Cantidad vendida: número de publicaciones de venta registradas por producto.",
    14,
    32,
    { maxWidth: 182 }
  );

  const body = sorted.map((r) => [r.name, formatIntegerCl(r.stock), formatIntegerCl(r.sold)]);

  autoTable(doc, {
    startY: 38,
    head: [["Producto", "Stock", "Cantidad vendida"]],
    body,
    styles: { font: "helvetica", fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [31, 65, 104], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 }
  });

  return doc.output("base64");
}
