export interface ManualReportEntry {
  id: string;
  subject: string;
  rawGrade: string;
}

export interface ManualInfraperiodReport {
  id: string;
  title: string;
  createdAt: string;
  entries: ManualReportEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Interpreta voti inseriti con la virgola o il punto, limitandoli all’intervallo 1–10. */
export function parseReportGrade(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!normalized || !/^\d+(?:\.\d*)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
}

/** Arrotonda al voto intero più vicino; i mezzi voti sono arrotondati per eccesso. */
export function roundReportGrade(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 1 || value > 10) return null;
  return Math.min(10, Math.floor(value + 0.5));
}

export function averageRoundedReport(entries: ManualReportEntry[]): number | null {
  const grades = entries
    .map((entry) => roundReportGrade(parseReportGrade(entry.rawGrade)))
    .filter((grade): grade is number => grade !== null);
  if (grades.length === 0) return null;
  return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
}

export function normalizeManualReports(value: unknown): ManualInfraperiodReport[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ManualInfraperiodReport[] => {
    if (!isRecord(item)) return [];
    const { id, title, createdAt, entries: rawEntries } = item;
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      typeof createdAt !== "string" ||
      !Array.isArray(rawEntries)
    ) {
      return [];
    }
    const entries = rawEntries.flatMap((entry: unknown): ManualReportEntry[] => {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        typeof entry.subject !== "string" ||
        typeof entry.rawGrade !== "string"
      ) {
        return [];
      }
      return [{ id: entry.id, subject: entry.subject, rawGrade: entry.rawGrade }];
    });
    return [{ id, title, createdAt, entries }];
  });
}
