import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { SchoolDataAuthGate } from "@/components/voto/SchoolDataAuthGate";
import { PRIVATE_SCHOOL_DATA_URL, supabase } from "@/lib/supabase-auth";
import { useVoto, VotoProvider } from "@/lib/voto/store";
import { KEYS } from "@/lib/voto/storage";

vi.mock("@/lib/voto/circulars", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/voto/circulars")>();
  return {
    ...actual,
    requestCircularCheck: vi.fn().mockRejectedValue(new Error("Polling disabilitato nel test.")),
  };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const session = {
  access_token: "test-access-token",
  user: { id: "owner-corrente", email: "studente@example.test" },
} as Session;

const remoteData = {
  subjects: [{ id: "subject-current", name: "Matematica", grades: [] }],
  notifications: [
    {
      id: "notice-current",
      type: "notice",
      title: "Circolare aggiornata",
      attachmentPath: `circulars/${"a".repeat(64)}.pdf`,
    },
  ],
};

function StateProbe() {
  const {
    ready,
    source,
    data,
    error,
    performanceMode,
    performanceOptions,
    setPerformanceMode,
    setPerformanceOption,
  } = useVoto();
  return (
    <>
      <p>{`${ready}:${source}:${data.notifications[0]?.title ?? "nessuna circolare"}`}</p>
      <output data-testid="data-error">{error ?? ""}</output>
      <output data-testid="performance-mode">{String(performanceMode)}</output>
      <output data-testid="performance-options">{JSON.stringify(performanceOptions)}</output>
      <button type="button" onClick={() => setPerformanceMode(!performanceMode)}>
        Toggle performance mode
      </button>
      <button
        type="button"
        onClick={() => setPerformanceOption("wallpapers", !performanceOptions.wallpapers)}
      >
        Toggle wallpaper optimization
      </button>
    </>
  );
}

function renderProtectedApp() {
  return render(
    <SchoolDataAuthGate>
      <VotoProvider>
        <StateProbe />
      </VotoProvider>
    </SchoolDataAuthGate>,
  );
}

function mockAuthSession() {
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session },
    error: null,
  } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
  vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never);
}

describe("bootstrap dati scolastici", () => {
  it("entra in modalità demo senza una sessione Supabase", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never);
    localStorage.setItem(KEYS.demoMode, "true");

    renderProtectedApp();

    expect(await screen.findByText(/^true:demo:/)).toBeInTheDocument();
  });

  it("ripristina la modalità prestazioni salvata e la applica alla root", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never);
    localStorage.setItem(KEYS.demoMode, "true");
    localStorage.setItem(KEYS.performanceMode, "true");

    renderProtectedApp();

    expect(await screen.findByTestId("performance-mode")).toHaveTextContent("true");
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-performance", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-blur", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-animations", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-shadows", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-wallpapers", "on");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle performance mode" }));
    await waitFor(() => {
      expect(screen.getByTestId("performance-mode")).toHaveTextContent("false");
      expect(document.documentElement).toHaveAttribute("data-performance", "off");
      expect(localStorage.getItem(KEYS.performanceMode)).toBe("false");
    });
  });

  it("ripristina e salva separatamente le opzioni prestazioni", async () => {
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: null },
      error: null,
    } as Awaited<ReturnType<typeof supabase.auth.getSession>>);
    vi.spyOn(supabase.auth, "onAuthStateChange").mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never);
    localStorage.setItem(KEYS.demoMode, "true");
    localStorage.setItem(KEYS.performanceMode, "true");
    localStorage.setItem(
      KEYS.performanceOptions,
      JSON.stringify({ blur: true, animations: false, wallpapers: false }),
    );

    renderProtectedApp();

    expect(await screen.findByTestId("performance-options")).toHaveTextContent(
      JSON.stringify({ blur: true, animations: false, shadows: true, wallpapers: false }),
    );
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-performance-blur", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-animations", "off");
      expect(document.documentElement).toHaveAttribute("data-performance-shadows", "on");
      expect(document.documentElement).toHaveAttribute("data-performance-wallpapers", "off");
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle wallpaper optimization" }));
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-performance-wallpapers", "on");
      expect(JSON.parse(localStorage.getItem(KEYS.performanceOptions) ?? "{}")).toHaveProperty(
        "wallpapers",
        true,
      );
    });
  });

  it("riusa il fetch del gate se la cache è di un altro account", async () => {
    mockAuthSession();
    localStorage.setItem(
      KEYS.cache,
      JSON.stringify({
        subjects: [],
        notifications: [{ id: "old", type: "notice", title: "Dati di un altro account" }],
      }),
    );
    localStorage.setItem("voto.privateOwnerId", JSON.stringify("owner-precedente"));
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(remoteData), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderProtectedApp();

    expect(await screen.findByText("true:remote:Circolare aggiornata")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(PRIVATE_SCHOOL_DATA_URL);
  });

  it("mantiene un refresh singolo quando la cache è già dello stesso account", async () => {
    mockAuthSession();
    localStorage.setItem("voto.privateOwnerId", JSON.stringify(session.user.id));
    localStorage.setItem(
      KEYS.cache,
      JSON.stringify({
        subjects: [],
        notifications: [{ id: "cached", type: "notice", title: "Cache account corrente" }],
      }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(remoteData), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderProtectedApp();

    expect(await screen.findByText("true:remote:Circolare aggiornata")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("mantiene la cache valida se DidUP restituisce una risposta senza materie", async () => {
    mockAuthSession();
    localStorage.setItem("voto.privateOwnerId", JSON.stringify(session.user.id));
    localStorage.setItem(
      KEYS.cache,
      JSON.stringify({
        student: { name: "Studente", schoolYear: "2026/2027" },
        subjects: [
          {
            id: "matematica",
            name: "Matematica",
            grades: [
              { id: "g1", value: 7, label: "7", date: "2026-10-01", type: "orale", weight: 1 },
              { id: "g2", value: 8, label: "8", date: "2026-10-05", type: "scritto", weight: 1 },
              { id: "g3", value: 6, label: "6", date: "2026-10-08", type: "orale", weight: 1 },
            ],
          },
        ],
        notifications: [{ id: "cached", type: "notice", title: "Ultimo dato valido" }],
      }),
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ subjects: [], notifications: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderProtectedApp();

    expect(await screen.findByText("true:cache:Ultimo dato valido")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("data-error")).toHaveTextContent(/non contiene materie/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    expect(JSON.parse(localStorage.getItem(KEYS.cache) ?? "{}").notifications[0].title).toBe(
      "Ultimo dato valido",
    );
  });
});
