import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/voto/AppShell";

const state = vi.hoisted(() => ({
  path: "/",
  theme: "windows-7",
  registryStyle: "default",
  ready: true,
  refresh: vi.fn(),
}));

// Unit-test the chrome without route loaders, providers or registry network calls.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: ComponentProps<"a"> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useRouterState: ({ select }: { select: (value: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: state.path } }),
}));
vi.mock("@/lib/voto/store", () => ({
  useVoto: () => ({
    ...state,
    source: "demo",
    loading: false,
    displayName: "Ada Studente",
    data: { student: { name: "Ada" } },
  }),
  useClock: () => new Date(2026, 10, 5, 8, 4, 0),
}));
vi.mock("@/components/voto/DidupDashboard", () => ({
  DidupDashboard: () => <p>Dashboard DidUP</p>,
}));
vi.mock("@/components/voto/DidupMenu", () => ({
  DidupMenu: () => <p>Menu DidUP</p>,
}));

const page = (children: ReactNode = <p>Contenuto scolastico</p>) => <AppShell>{children}</AppShell>;
const openStart = () => {
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  return screen.getByRole("dialog", { name: "Menu Start" });
};

beforeEach(() => {
  state.path = "/";
  state.theme = "windows-7";
  state.registryStyle = "default";
  state.ready = true;
  state.refresh.mockReset();
});
afterEach(cleanup);

describe("Windows 7 chrome", () => {
  it("adds a route title and separate toolbar while preserving functional commands", () => {
    state.path = "/compiti";
    const { container } = render(page());
    expect(container.querySelector(".windows7-shell")).toBeInTheDocument();
    expect(container.querySelector(".windows7-titlebar")).toHaveTextContent("VOTO");
    expect(container.querySelector(".windows7-titlebar")).toHaveTextContent("Compiti assegnati");
    const toolbar = within(container.querySelector(".windows7-toolbar") as HTMLElement);
    expect(toolbar.getByRole("link", { name: "Assistente" })).toHaveAttribute(
      "href",
      "/assistente",
    );
    expect(toolbar.getByRole("button", { name: "Novità" })).toBeInTheDocument();
    fireEvent.click(toolbar.getByRole("button", { name: "Aggiorna dati" }));
    expect(state.refresh).toHaveBeenCalledOnce();
  });

  it("opens a non-modal Start overlay with every destination without replacing the page", () => {
    render(page());
    const menu = openStart();
    expect(menu).toHaveAttribute("aria-modal", "false");
    expect(screen.getByText("Contenuto scolastico")).toBeVisible();
    expect(screen.getByRole("button", { name: "Start" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Start" })).toHaveAttribute("aria-controls", menu.id);
    const destinations = [
      ["Dashboard", "/"],
      ["Orario", "/orario"],
      ["Voti", "/voti"],
      ["Scrutini infraperiodali", "/scrutini-infraperiodali"],
      ["Compiti assegnati", "/compiti"],
      ["Interrogazioni", "/interrogazioni"],
      ["Diario", "/diario"],
      ["Note", "/note"],
      ["Promemoria", "/promemoria"],
      ["Professori", "/professori"],
      ["Personalizza", "/personalizza"],
      ["Impostazioni", "/impostazioni"],
      ["Studio Lab.", "/studio"],
      ["Assistente", "/assistente"],
    ] as const;
    for (const [name, href] of destinations) {
      expect(within(menu).getByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(within(menu).getByText("Ada Studente")).toBeVisible();
  });

  it("toggles Start closed and restores Start focus after Escape", () => {
    render(page());
    openStart();
    expect(
      within(screen.getByRole("dialog")).getByRole("link", { name: "Dashboard" }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toHaveFocus();
    expect(start).toHaveAttribute("aria-expanded", "false");
    openStart();
    fireEvent.click(start);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on an outside pointer interaction", () => {
    render(page());
    openStart();
    fireEvent.pointerDown(screen.getByText("Contenuto scolastico"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Contenuto scolastico")).toBeVisible();
  });

  it("closes on link selection even for the current route", () => {
    render(page());
    const menu = openStart();
    const currentLink = within(menu).getByRole("link", { name: "Dashboard" });
    expect(currentLink).toHaveAttribute("aria-current", "page");
    fireEvent.click(currentLink);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when the route changes independently of the Start menu", () => {
    const { rerender, container } = render(page());
    openStart();
    state.path = "/orario";
    rerender(page());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(container.querySelector(".windows7-titlebar")).toHaveTextContent("Orario");
    expect(
      within(screen.getByRole("navigation", { name: "Navigazione principale" })).getByRole("link", {
        name: "Orario",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("has taskbar links and a hydration-safe Italian clock", () => {
    const { container, rerender } = render(page());
    const nav = within(screen.getByRole("navigation", { name: "Navigazione principale" }));
    expect(nav.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(nav.getByRole("link", { name: "Orario" })).toHaveAttribute("href", "/orario");
    expect(container.querySelector(".windows7-clock-time")).toHaveTextContent("08:04");
    expect(container.querySelector(".windows7-clock-date")).toHaveTextContent("05/11/2026");
    state.ready = false;
    rerender(page());
    expect(container.querySelector(".windows7-clock-time")).toHaveTextContent("--:--");
    expect(container.querySelector(".windows7-clock-date")).toHaveTextContent("--/--/----");
    expect(container.querySelector("time")).not.toHaveAttribute("datetime");
  });

  it("keeps the old More menu for other themes", () => {
    state.theme = "default";
    const { container } = render(page());
    expect(container.querySelector(".windows7-shell")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Menu Altro" }));
    expect(screen.getByRole("region", { name: "Menu principale" })).toBeInTheDocument();
    expect(screen.queryByText("Contenuto scolastico")).not.toBeInTheDocument();
  });

  it("never applies Windows 7 chrome to DidUP", () => {
    state.registryStyle = "didup";
    const { container } = render(page());
    expect(container.querySelector(".windows7-shell")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard DidUP")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByText("Menu DidUP")).toBeVisible();
  });
});
