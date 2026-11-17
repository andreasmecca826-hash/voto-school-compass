import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DidupSyncSettings } from "@/components/voto/DidupSyncSettings";

const native = vi.hoisted(() => ({
  status: {
    enabled: false,
    hasCredentials: true,
    hasSession: true,
    intervalMinutes: 360,
    status: "idle",
    message: "",
    lastSyncAt: "",
    lastAttemptAt: "",
  },
  getStatus: vi.fn(),
  setEnabled: vi.fn(),
  clear: vi.fn(),
  saveCredentials: vi.fn(),
  syncNow: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "android" } }));

vi.mock("@/lib/native-didup-sync", () => ({
  clearNativeDidupSync: native.clear,
  getNativeDidupSyncStatus: native.getStatus,
  requestNativeDidupSync: native.syncNow,
  saveNativeDidupCredentials: native.saveCredentials,
  setNativeDidupSyncEnabled: native.setEnabled,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  native.status = {
    enabled: false,
    hasCredentials: true,
    hasSession: true,
    intervalMinutes: 360,
    status: "idle",
    message: "",
    lastSyncAt: "",
    lastAttemptAt: "",
  };
  native.getStatus.mockReset().mockImplementation(async () => ({ ...native.status }));
  native.setEnabled.mockReset().mockImplementation(async (enabled, intervalMinutes) => {
    native.status = { ...native.status, enabled, intervalMinutes };
  });
  native.clear.mockReset();
  native.saveCredentials.mockReset();
  native.syncNow.mockReset();
});

afterEach(() => cleanup());

describe("toggle sincronizzazione DidUP", () => {
  it("mostra se è attiva o sospesa e aggiorna subito lo stato quando si tocca", async () => {
    render(<DidupSyncSettings />);
    const toggle = await screen.findByRole("switch", {
      name: "Sincronizzazione periodica DidUP",
    });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Sospesa")).toBeInTheDocument();
    expect(screen.getByText("Controllo periodico sospeso · ogni 6 ore")).toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(native.setEnabled).toHaveBeenCalledWith(true, 360);
    expect(screen.getByText("Attiva")).toBeInTheDocument();
    expect(screen.getByText("Controllo periodico attivo · ogni 6 ore")).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(native.setEnabled).toHaveBeenLastCalledWith(false, 360);
  });

  it("spiega perché il toggle non è disponibile senza credenziali", async () => {
    native.status = { ...native.status, hasCredentials: false };
    render(<DidupSyncSettings />);

    expect(
      await screen.findByText("Salva le credenziali DidUP per attivare il controllo periodico."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Sincronizzazione periodica DidUP" }),
    ).not.toBeInTheDocument();
  });
});
