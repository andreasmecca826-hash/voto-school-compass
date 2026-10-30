import {
  Bell,
  CalendarCheck2,
  CalendarX2,
  CircleUserRound,
  ClipboardList,
  Backpack,
  BookOpenText,
  FilePenLine,
  MessageSquareText,
  NotebookTabs,
  Palette,
  Settings,
  AlarmClock,
  UsersRound,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useVoto } from "@/lib/voto/store";
import { cn } from "@/lib/utils";

type MenuItem = {
  label: string;
  color: string;
  icon: typeof Bell;
  to?: string;
  muted?: boolean;
};

const ITEMS: MenuItem[] = [
  { label: "Eventi appello", color: "#00aebd", icon: CalendarX2, to: "/interrogazioni" },
  { label: "Note", color: "#f39a88", icon: FilePenLine, to: "/note" },
  { label: "Voti giornalieri", color: "#ec7365", icon: BookOpenText, to: "/voti" },
  { label: "Voti scrutini", color: "#8f54c9", icon: NotebookTabs, to: "/scrutini-infraperiodali" },
  { label: "Attività svolta", color: "#3c9ed9", icon: MessageSquareText, to: "/diario" },
  { label: "Compiti assegnati", color: "#6064e9", icon: Backpack, to: "/compiti" },
  { label: "Promemoria", color: "#ff5264", icon: CalendarCheck2, to: "/" },
  { label: "Orario", color: "#e99abd", icon: AlarmClock, to: "/orario" },
  { label: "Ricevimento docenti", color: "#8fc783", icon: UsersRound, to: "/professori" },
  { label: "Bacheca", color: "#06afbd", icon: ClipboardList, to: "/" },
  { label: "Personalizza", color: "#e3a63b", icon: Palette, to: "/personalizza" },
  { label: "Impostazioni", color: "#3b75b8", icon: Settings, to: "/impostazioni" },
];

export function DidupMenu() {
  const v = useVoto();
  const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();

  return (
    <div className="didup-page min-h-dvh bg-black px-2 pb-24 text-white">
      <header className="flex items-start justify-between px-3 pb-7 pt-4">
        <div>
          <h1 className="text-[26px] font-normal tracking-tight">Menu</h1>
          <p className="text-sm text-white/75">{studentName}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#03a8b5]">
          <CircleUserRound className="h-8 w-8" />
        </div>
      </header>
      <div className="grid grid-cols-2 gap-5 px-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span
                className="absolute right-2 top-2 flex h-12 w-12 items-center justify-center"
                style={{ color: item.color }}
              >
                <Icon className="h-8 w-8" />
              </span>
              <span className="text-center text-[18px] font-bold leading-tight">{item.label}</span>
            </>
          );
          const className = cn(
            "didup-menu-card relative flex min-h-[132px] items-center justify-center overflow-hidden rounded-[9px] p-4",
            item.muted && "opacity-65",
          );
          return item.to ? (
            <Link key={item.label} to={item.to} className={className}>
              {content}
            </Link>
          ) : (
            <button key={item.label} type="button" disabled className={className}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
