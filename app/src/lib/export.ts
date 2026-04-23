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

/** Descarga (web) o comparte / guarda (nativo) un PDF desde base64 o data URI. */
export async function saveOrSharePdfFromBase64(filename: string, base64OrDataUri: string): Promise<boolean> {
  const safeName = filename.replace(/[/\\?%*:|"<>]/g, "-");
  const fileNameWithExt = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
  const dataUriPrefix = "data:application/pdf;";
  const isDataUri = base64OrDataUri.startsWith(dataUriPrefix);
  const base64 = isDataUri ? base64OrDataUri.split(",", 2)[1] ?? "" : base64OrDataUri;

  if (Platform.OS === "web") {
    const url = isDataUri ? base64OrDataUri : `data:application/pdf;base64,${base64}`;
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileNameWithExt);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (!isDataUri) URL.revokeObjectURL(url);
    return true;
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return false;

  const uri = `${cacheDir}${fileNameWithExt}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Guardar o compartir PDF" });
    return true;
  }

  return false;
}
