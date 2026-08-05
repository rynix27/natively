import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { Upload, CheckCircle, AlertTriangle, Loader2, FileText, X } from "lucide-react";

interface CsvRow {
  name: string;
  sector: string;
  website: string;
  crunchbase_url: string;
  linkedin_url: string;
  description: string;
  founded_year: string;
  country: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // We ignore headers (line 0) and use positional mapping as specified
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);

    rows.push({
      name: (values[0] ?? "").trim().replace(/^"|"$/g, ""),
      sector: (values[1] ?? "").trim().replace(/^"|"$/g, ""),
      website: (values[2] ?? "").trim().replace(/^"|"$/g, ""),
      crunchbase_url: (values[3] ?? "").trim().replace(/^"|"$/g, ""),
      linkedin_url: (values[4] ?? "").trim().replace(/^"|"$/g, ""),
      description: (values[5] ?? "").trim().replace(/^"|"$/g, ""),
      founded_year: (values[6] ?? "").trim().replace(/^"|"$/g, ""),
      country: (values[7] ?? "").trim().replace(/^"|"$/g, ""),
    });
  }

  return rows;
}

type ImportStatus = "idle" | "preview" | "importing" | "done" | "error";

const CHUNK_SIZE = 50;

export default function AdminImport() {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const [failed, setFailed] = useState(0);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target?.result;
        if (typeof text !== "string") {
          setError("Could not read file as text.");
          setStatus("error");
          return;
        }
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError("No data rows found in CSV. Make sure the file has a header row and at least one data row.");
          setStatus("error");
          return;
        }
        setRows(parsed);
        setError(null);
        setStatus("preview");
      } catch {
        setError("Failed to parse the CSV file. Check the file format.");
        setStatus("error");
      }
    };

    reader.onerror = () => {
      setError("Failed to read the file.");
      setStatus("error");
    };

    reader.readAsText(file);
  }, []);

  const handleImport = useCallback(async () => {
    setStatus("importing");
    setImported(0);
    setFailed(0);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE).map((row) => ({
        name: row.name || "Unknown",
        sector: row.sector || null,
        website: row.website || null,
        crunchbase_url: row.crunchbase_url || null,
        linkedin_url: row.linkedin_url || null,
        description: row.description || null,
        founded_year: row.founded_year ? parseInt(row.founded_year, 10) : null,
        country: row.country || null,
      }));

      const { error: insertError } = await supabase
        .from("companies")
        .insert(chunk);

      if (insertError) {
        // If bulk insert fails, try one-by-one for this chunk
        for (const company of chunk) {
          const { error: singleError } = await supabase
            .from("companies")
            .insert(company);

          if (singleError) {
            failCount++;
          } else {
            successCount++;
          }
        }
      } else {
        successCount += chunk.length;
      }

      setImported(successCount);
      setFailed(failCount);
    }

    setStatus("done");
  }, [rows]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setRows([]);
    setFileName("");
    setError(null);
    setImported(0);
    setFailed(0);
    // Reset file input
    const input = document.getElementById("csv-file") as HTMLInputElement;
    if (input) input.value = "";
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="bg-surface border border-border rounded-xl p-8">
          <h1
            className="text-2xl font-semibold text-foreground mb-1"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Admin: Import Companies
          </h1>
          <p className="text-text-muted text-sm mb-8">
            Upload a CSV to seed the companies table. Expected columns (positional, no header mapping):{" "}
            <span className="text-foreground font-medium">
              name, sector, website, crunchbase_url, linkedin_url, description, founded_year, country
            </span>
          </p>

          {/* States */}
          {status === "idle" && (
            <label
              htmlFor="csv-file"
              className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary transition-colors duration-200"
            >
              <Upload className="w-10 h-10 text-text-muted" />
              <div className="text-center">
                <p className="text-foreground font-medium">Click to select a CSV file</p>
                <p className="text-text-muted text-sm mt-1">
                  The first row is treated as a header and skipped
                </p>
              </div>
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />
            </label>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-destructive font-medium text-sm">Import Error</p>
                  <p className="text-foreground text-sm mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-text-muted hover:text-foreground transition-colors duration-150 text-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
                Try a different file
              </button>
            </div>
          )}

          {status === "preview" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 text-sm">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-foreground font-medium">{fileName}</span>
                <span className="text-text-muted">
                  — {rows.length} row{rows.length !== 1 ? "s" : ""} found
                </span>
                <button
                  onClick={handleReset}
                  className="ml-auto text-text-muted hover:text-foreground transition-colors duration-150 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-elevated">
                      <th className="text-left px-4 py-2.5 text-text-muted font-medium whitespace-nowrap">Name</th>
                      <th className="text-left px-4 py-2.5 text-text-muted font-medium whitespace-nowrap">Sector</th>
                      <th className="text-left px-4 py-2.5 text-text-muted font-medium whitespace-nowrap">Country</th>
                      <th className="text-left px-4 py-2.5 text-text-muted font-medium whitespace-nowrap">Founded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-t border-border-light">
                        <td className="px-4 py-2.5 text-foreground">{row.name || "—"}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.sector || "—"}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.country || "—"}</td>
                        <td className="px-4 py-2.5 text-foreground">{row.founded_year || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && (
                  <div className="px-4 py-2 text-text-muted text-xs bg-surface-elevated border-t border-border">
                    …and {rows.length - 5} more row{rows.length - 5 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>

              <button
                onClick={handleImport}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-background font-semibold py-3 px-6 rounded-lg transition-all duration-200 cursor-pointer active:scale-[0.97]"
              >
                <Upload className="w-4 h-4" />
                Import {rows.length} Companies
              </button>
            </div>
          )}

          {status === "importing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-foreground font-medium">Importing companies…</p>
              <p className="text-text-muted text-sm">
                {imported} imported{imported > 0 && failed > 0 ? "," : ""}{" "}
                {failed > 0 && `${failed} failed`}
              </p>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 bg-success/10 border border-success/30 rounded-lg p-4">
                <CheckCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <div>
                  <p className="text-success font-medium text-sm">Import Complete</p>
                  <p className="text-foreground text-sm mt-1">
                    Successfully imported {imported} of {rows.length} companies
                    {failed > 0 && ` — ${failed} rows failed`}.
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-surface-elevated hover:bg-border text-foreground font-medium py-3 px-6 rounded-lg transition-colors duration-200 cursor-pointer"
              >
                Import Another File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
