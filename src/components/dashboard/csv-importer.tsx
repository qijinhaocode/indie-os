"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Upload, X, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ImportType = "revenue" | "time";

interface ParsedRow {
  [key: string]: string;
}

const REVENUE_HEADERS = ["date", "amount", "currency", "type", "source", "project"];
const TIME_HEADERS = ["date", "hours", "minutes", "project", "description"];

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row;
  });
  return { headers, rows };
}

export function CsvImporter() {
  const t = useTranslations("csvImport");
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("revenue");
  const [parsed, setParsed] = useState<{ headers: string[]; rows: ParsedRow[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParsed(parseCSV(text));
    };
    reader.readAsText(file);
  }

  function handleReset() {
    setParsed(null);
    setFileName("");
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, rows: parsed.rows }),
      });
      const data = (await res.json()) as { imported: number; errors: string[] };
      setResult(data);
      if (data.imported > 0) {
        handleReset();
        router.refresh();
      }
    } finally {
      setImporting(false);
    }
  }

  const expectedHeaders = importType === "revenue" ? REVENUE_HEADERS : TIME_HEADERS;
  const previewRows = parsed?.rows.slice(0, 5) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t("desc")}</p>

        {/* Type selector */}
        <div className="flex gap-2">
          {(["revenue", "time"] as ImportType[]).map((tp) => (
            <button
              key={tp}
              onClick={() => { setImportType(tp); handleReset(); }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                importType === tp
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:bg-accent"
              }`}
            >
              {t(`type.${tp}`)}
            </button>
          ))}
        </div>

        {/* Template hint */}
        <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
          <p className="text-xs font-medium text-foreground">{t("format")}</p>
          <p className="text-xs font-mono text-muted-foreground">
            {expectedHeaders.join(",")}
          </p>
          <p className="text-xs text-muted-foreground">{t(`example.${importType}`)}</p>
        </div>

        {/* File upload */}
        {!parsed ? (
          <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border px-6 py-8 cursor-pointer hover:bg-muted/30 transition-colors">
            <FileText className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm font-medium">{t("clickToUpload")}</span>
            <span className="text-xs text-muted-foreground mt-1">{t("csvOnly")}</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">
                  ({parsed.rows.length} {t("rows")})
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview */}
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {parsed.headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      {parsed.headers.map((h) => (
                        <td key={h} className="px-3 py-2 max-w-24 truncate">
                          {row[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && (
                <p className="text-xs text-muted-foreground px-3 py-2 border-t border-border">
                  {t("andMore", { count: parsed.rows.length - 5 })}
                </p>
              )}
            </div>

            <Button onClick={handleImport} disabled={importing} size="sm">
              {importing
                ? t("importing")
                : t("importAll", { count: parsed.rows.length })}
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`rounded-md px-3 py-2 text-sm flex items-start gap-2 ${
            result.imported > 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            {result.imported > 0 ? (
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {result.imported > 0 ? t("success", { count: result.imported }) : t("noImported")}
              </p>
              {result.errors.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs opacity-80 list-disc list-inside">
                  {result.errors.slice(0, 3).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                  {result.errors.length > 3 && (
                    <li>{t("moreErrors", { count: result.errors.length - 3 })}</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
