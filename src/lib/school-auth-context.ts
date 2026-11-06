import { createContext, useContext } from "react";

export type SchoolAuth = { email: string; signOut: () => Promise<void> };
export const SchoolAuthContext = createContext<SchoolAuth | null>(null);

export function useSchoolAuth() {
  const value = useContext(SchoolAuthContext);
  if (!value) throw new Error("useSchoolAuth deve essere usato dentro SchoolDataAuthGate.");
  return value;
}
