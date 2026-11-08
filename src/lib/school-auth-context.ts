import { createContext, useContext } from "react";
import type { VotoData } from "./voto/types";

export type PrefetchedSchoolData = { url: string; data: VotoData; lastSync: string };

export type SchoolAuth = {
  email: string;
  signOut: () => Promise<void>;
  consumePrefetchedData: () => PrefetchedSchoolData | null;
};
export const SchoolAuthContext = createContext<SchoolAuth | null>(null);

export function useSchoolAuth() {
  const value = useContext(SchoolAuthContext);
  if (!value) throw new Error("useSchoolAuth deve essere usato dentro SchoolDataAuthGate.");
  return value;
}
