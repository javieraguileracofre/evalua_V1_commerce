import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export function toCsv(headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const head = headers.map(escapeCsvCell).join(",");
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csvContent: string) {
  if (Platform.OS !== "web") return false;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

/** Descarga (web) o comparte / guarda (nativo) un PDF a partir de base64 sin prefijo data:. */
export async function saveOrSharePdfFromBase64(filename: string, base64: string): Promise<boolean> {
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, "-");

  if (Platform.OS === "web") {
    if (typeof atob === "undefined") return false;
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return false;

  const uri = `${cacheDir}${safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Guardar o compartir PDF" });
    return true;
  }

  return false;
}
