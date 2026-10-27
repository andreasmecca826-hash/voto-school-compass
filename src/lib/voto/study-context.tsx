import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { nextPomodoro, POMODORO_SECONDS, type Flashcard, type PomodoroMode } from "./study";

function useStudyState() {
  const [mode, setMode] = useState<PomodoroMode>("focus");
  const [seconds, setSeconds] = useState(POMODORO_SECONDS.focus);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(0);
  const deadline = useRef(0);
  const [cards, setCards] = useState<Flashcard[]>([]);
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        const next = nextPomodoro(mode, completed);
        setCompleted(next.completed);
        setMode(next.mode);
        setSeconds(POMODORO_SECONDS[next.mode]);
        setRunning(false);
        toast.success(mode === "focus" ? "Sessione completata. È ora della pausa!" : "Pausa finita. Si torna a studiare!");
      }
    };
    const timer = setInterval(tick, 250);
    const onVisible = () => tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [running, mode, completed]);
  const toggle = () => {
    if (running) setSeconds(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    else deadline.current = Date.now() + seconds * 1000;
    setRunning(!running);
  };
  const selectMode = (next: PomodoroMode) => { setRunning(false); setMode(next); setSeconds(POMODORO_SECONDS[next]); };
  return { mode, seconds, running, completed, toggle, selectMode, reset: () => selectMode(mode), cards, setCards };
}
const Context = createContext<ReturnType<typeof useStudyState> | null>(null);
export function StudyProvider({ children }: { children: ReactNode }) {
  const state = useStudyState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useStudy() {
  const state = useContext(Context);
  if (!state) throw new Error("StudyProvider mancante");
  return state;
}