"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

type ExportButtonProps = {
  filename?: string
  data: unknown[]
  onExportPdf?: () => void // optional, can be wired later
  label?: { en: string; fr: string }
  language?: "en" | "fr"
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export function ExportButton({ filename = "analytics.csv", data, label, language = "en", onExportPdf }: ExportButtonProps) {
  const handleExportCsv = () => {
    // Only handle array of objects for CSV
    const rows = Array.isArray(data) ? (data.filter((d) => typeof d === "object" && d !== null) as Record<string, unknown>[]) : [];
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const text = label ? (language === "fr" ? label.fr : label.en) : language === "fr" ? "Exporter" : "Export";

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleExportCsv}>
        <Download className="h-4 w-4 mr-2" /> {text} CSV
      </Button>
      {onExportPdf ? (
        <Button variant="outline" size="sm" onClick={onExportPdf}>
          <Download className="h-4 w-4 mr-2" /> {language === "fr" ? "Exporter PDF" : "Export PDF"}
        </Button>
      ) : null}
    </div>
  );
}

