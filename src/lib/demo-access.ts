const DEFAULT_DEMO_ACCESS_CODE = "VOTO-DEMO-DEV";

export const DEMO_ACCESS_CODE =
  ((import.meta.env["VITE_DEMO_ACCESS_CODE"] as string | undefined) || DEFAULT_DEMO_ACCESS_CODE)
    .trim()
    .toUpperCase();

export function isDemoAccessCode(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, "-").toUpperCase();
  return normalized.length > 0 && normalized === DEMO_ACCESS_CODE;
}
