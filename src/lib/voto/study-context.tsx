import { createContext, useContext, useState, type ReactNode } from "react";
import type { Flashcard } from "./study";

type StudyContextValue = {
  cards: Flashcard[];
  setCards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
};

const Context = createContext<StudyContextValue | null>(null);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  return <Context.Provider value={{ cards, setCards }}>{children}</Context.Provider>;
}

export function useStudy() {
  const state = useContext(Context);
  if (!state) throw new Error("StudyProvider mancante");
  return state;
}
