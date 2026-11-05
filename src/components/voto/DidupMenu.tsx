import {
  Bell,
  CalendarCheck2,
  CalendarX2,
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
  iconImage?: string;
  to?: string;
  muted?: boolean;
};

const ITEMS: MenuItem[] = [
  {
    label: "Eventi appello",
    color: "#00a4b8",
    icon: CalendarX2,
    iconImage: "/didup-menu-icons/eventi-appello.png",
    to: "/eventi-appello",
  },
  {
    label: "Note",
    color: "#faad91",
    icon: FilePenLine,
    iconImage: "/didup-menu-icons/note.png",
    to: "/note",
  },
  {
    label: "Voti giornalieri",
    color: "#da6a56",
    icon: BookOpenText,
    iconImage: "/didup-menu-icons/voti-giornalieri.png",
    to: "/voti",
  },
  {
    label: "Voti scrutini",
    color: "#996bce",
    icon: NotebookTabs,
    iconImage: "/didup-menu-icons/voti-scrutini.png",
    to: "/scrutini-infraperiodali",
  },
  {
    label: "Attività svolta",
    color: "#3688d1",
    icon: MessageSquareText,
    iconImage: "/didup-menu-icons/attivita-svolta.png",
    to: "/diario",
  },
  {
    label: "Compiti assegnati",
    color: "#6a79f8",
    icon: Backpack,
    iconImage: "/didup-menu-icons/compiti-assegnati.png",
    to: "/compiti",
  },
  {
    label: "Promemoria",
    color: "#ff565d",
    icon: CalendarCheck2,
    iconImage: "/didup-menu-icons/promemoria.png",
    to: "/",
  },
  {
    label: "Orario",
    color: "#f4b0c7",
    icon: AlarmClock,
    iconImage: "/didup-menu-icons/orario.png",
    to: "/orario",
  },
  {
    label: "Ricevimento docenti",
    color: "#8ab971",
    icon: UsersRound,
    iconImage: "/didup-menu-icons/ricevimento-docenti.png",
    to: "/professori",
  },
  {
    label: "Bacheca",
    color: "#00a4b8",
    icon: ClipboardList,
    iconImage: "/didup-menu-icons/bacheca.png",
    to: "/",
  },
  {
    label: "Personalizza",
    color: "#e3a63b",
    icon: Palette,
    iconImage: "/didup-menu-icons/personalizza.svg",
    to: "/personalizza",
  },
  {
    label: "Impostazioni",
    color: "#3b75b8",
    icon: Settings,
    iconImage: "/didup-menu-icons/impostazioni.svg",
    to: "/impostazioni",
  },
];

export function DidupMenu() {
  const v = useVoto();
  const studentName = (v.data.student.name || "ANDREA MARIA").toUpperCase();

  return (
    <div className="didup-page min-h-dvh bg-black pb-24 pl-2 text-white">
      <header className="flex items-start justify-between pb-7 pl-4 pr-[7px] pt-4">
        <div>
          <h1 className="text-[26px] font-normal tracking-tight">Menu</h1>
          <p className="text-sm text-white/75">{studentName}</p>
        </div>
        <img
          src="/didup-profile.jpg"
          alt=""
          aria-hidden="true"
          className="h-12 w-12 object-cover"
        />
      </header>
      <div className="grid grid-cols-2 gap-x-[15px] gap-y-[27px] pr-2">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              {item.iconImage ? (
                <img
                  src={
                    item.iconImage.endsWith(".png")
                      ? item.iconImage.replace(
                          "/didup-menu-icons/",
                          "/didup-menu-icons-no-gray/",
                        )
                      : item.iconImage
                  }
                  alt=""
                  aria-hidden="true"
                  className="absolute right-0 top-0 h-9 w-9 select-none"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 36 36"
                    className="absolute inset-0 h-full w-full"
                    focusable="false"
                  >
                    <path d="M0 0h36v36H18A18 18 0 0 1 0 18V0Z" fill={item.color} />
                  </svg>
                  <Icon className="relative z-10 h-5 w-5" strokeWidth={1.35} />
                </span>
              )}
              <span className="text-center text-[16px] font-bold leading-tight">{item.label}</span>
            </>
          );
          const className = cn(
            "didup-menu-card relative flex min-h-[93px] items-center justify-center overflow-hidden rounded-[9px] p-1",
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
