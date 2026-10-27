import { createContext, useContext } from "react";

export interface AppPinLockContextValue {
  hasPin: boolean;
  savePin: (pin: string) => Promise<void>;
  removePin: () => void;
  lockNow: () => void;
}

export const AppPinLockContext = createContext<AppPinLockContextValue | null>(null);

export function useAppPinLock(): AppPinLockContextValue {
  const context = useContext(AppPinLockContext);
  if (!context) throw new Error("useAppPinLock fuori da AppPinLockProvider");
  return context;
}
