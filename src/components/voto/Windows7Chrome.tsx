import { Link } from "@tanstack/react-router";
import { GraduationCap, MessageCircle, Sparkles, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Windows7NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export function Windows7Orb({ className }: { className?: string }) {
  return (
    <span className={cn("windows7-orb", className)} aria-hidden="true">
      <svg className="windows7-orb-icon" viewBox="0 0 24 24" width="24" height="24" fill="none">
        <path d="M3 4.5 11 3v8H3z" fill="#f25022" />
        <path d="m13 3 8 1.5V11h-8z" fill="#7fba00" />
        <path d="M3 13h8v8l-8-1.5z" fill="#00a4ef" />
        <path d="M13 13h8v6.5L13 21z" fill="#ffb900" />
      </svg>
    </span>
  );
}

interface Windows7TaskbarProps {
  navigation: readonly Windows7NavItem[];
  moreNavigation: readonly Windows7NavItem[];
  currentPath: string;
  studentName: string;
  now: Date;
  ready: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isCurrent = (to: string, path: string) =>
  to === "/" ? path === "/" : path === to || path.startsWith(`${to}/`);

export function Windows7Taskbar({
  navigation,
  moreNavigation,
  currentPath,
  studentName,
  now,
  ready,
  open,
  onOpenChange,
}: Windows7TaskbarProps) {
  const menuId = useId();
  const startRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const previousPath = useRef(currentPath);
  const close = () => onOpenChange(false);

  useEffect(() => {
    if (previousPath.current !== currentPath) onOpenChange(false);
    previousPath.current = currentPath;
  }, [currentPath, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!menuRef.current?.contains(event.target) && !startRef.current?.contains(event.target)) {
        onOpenChange(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onOpenChange(false);
      startRef.current?.focus();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const settings = moreNavigation.filter(
    ({ to }) => to === "/personalizza" || to === "/impostazioni",
  );
  const programs = moreNavigation.filter(
    ({ to }) => to !== "/personalizza" && to !== "/impostazioni",
  );
  const timeLabel = ready
    ? now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--";
  const dateLabel = ready
    ? now.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "--/--/----";

  const renderLink = ({ to, label, icon: Icon }: Windows7NavItem) => (
    <Link
      key={to}
      to={to}
      onClick={close}
      aria-current={isCurrent(to, currentPath) ? "page" : undefined}
      className="windows7-start-link"
    >
      <Icon className="windows7-start-link-icon h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return (
    <div className="windows7-taskbar safe-bottom fixed inset-x-0 bottom-0 z-40 w-full">
      <div className="windows7-taskbar-inner relative mx-auto flex w-full max-w-[960px] items-center">
        <button
          ref={startRef}
          type="button"
          className={cn("windows7-start-button", open && "windows7-start-button-active")}
          aria-label="Start"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => onOpenChange(!open)}
        >
          <Windows7Orb className="windows7-start-orb" />
          <span className="windows7-start-label">Start</span>
        </button>
        <nav
          className="windows7-taskbar-nav flex min-w-0 flex-1"
          aria-label="Navigazione principale"
        >
          {navigation.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              aria-current={isCurrent(to, currentPath) ? "page" : undefined}
              className={cn(
                "windows7-taskbar-item windows7-taskbar-link",
                isCurrent(to, currentPath) && "windows7-taskbar-link-active",
              )}
              title={label}
            >
              <Icon className="windows7-taskbar-icon h-5 w-5" aria-hidden="true" />
              <span className="windows7-taskbar-label">{label}</span>
            </Link>
          ))}
        </nav>
        <time
          className="windows7-taskbar-clock windows7-clock shrink-0"
          dateTime={ready ? now.toISOString() : undefined}
          aria-label={ready ? `${timeLabel}, ${dateLabel}` : "Caricamento orologio"}
        >
          <span className="windows7-clock-time block">{timeLabel}</span>
          <span className="windows7-clock-date block">{dateLabel}</span>
        </time>
        {open && (
          <div
            ref={menuRef}
            id={menuId}
            role="dialog"
            aria-modal="false"
            aria-label="Menu Start"
            className="windows7-start-menu absolute bottom-full left-0 mb-2 w-full"
          >
            <div className="windows7-start-heading">
              <span>Menu Start</span>
              <button
                type="button"
                className="windows7-start-close"
                onClick={() => {
                  close();
                  startRef.current?.focus();
                }}
                aria-label="Chiudi menu Start"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="windows7-start-columns">
              <nav className="windows7-start-programs" aria-label="Applicazioni scolastiche">
                {navigation.map(renderLink)}
                {programs.map(renderLink)}
                {renderLink({ to: "/studio", label: "Studio Lab.", icon: Sparkles })}
                {renderLink({ to: "/assistente", label: "Assistente", icon: MessageCircle })}
              </nav>
              <aside className="windows7-start-sidebar" aria-label="Profilo e preferenze">
                <div className="windows7-start-profile">
                  <span className="windows7-start-avatar" aria-hidden="true">
                    <GraduationCap className="h-8 w-8" />
                  </span>
                  <span className="windows7-start-student">{studentName}</span>
                  <span className="windows7-start-profile-label">Registro scolastico VOTO</span>
                </div>
                <nav className="windows7-start-settings" aria-label="Preferenze">
                  {settings.map(renderLink)}
                </nav>
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
