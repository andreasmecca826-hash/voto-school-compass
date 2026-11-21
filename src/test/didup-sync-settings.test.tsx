import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DidupSyncSettings } from "@/components/voto/DidupSyncSettings";

const native = vi.hoisted(() => ({
  status: {
    enabled: false,
    hasCredentials: true,
    hasSession: true,
    intervalMinutes: 360,
    variableInterval: false,
    quietHoursEnabled: true,
    quietHoursStart: "00:00",
    quietHoursEnd: "06:00",
    updateNotificationsEnabled: false,
    notificationPermissionGranted: true,
    status: "idle",
    message: "",
    lastSyncAt: "",
    lastAttemptAt: "",
  },
  getStatus: vi.fn(),
  openAppSettings: vi.fn(),
  setEnabled: vi.fn(),
  setQuietHours: vi.fn(),
  setUpdateNotifications: vi.fn(),
  clear: vi.fn(),
  saveCredentials: vi.fn(),
  syncNow: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { getPlatform: () => "android" } }));

vi.mock("@/lib/native-didup-sync", () => ({
  clearNativeDidupSync: native.clear,
  getNativeDidupSyncStatus: native.getStatus,
  openNativeDidupAppSettings: native.openAppSettings,
  requestNativeDidupSync: native.syncNow,
  saveNativeDidupCredentials: native.saveCredentials,
  setNativeDidupQuietHours: native.setQuietHours,
  setNativeDidupSyncEnabled: native.setEnabled,
  setNativeDidupUpdateNotificationsEnabled: native.setUpdateNotifications,
  openNativeDidupNotificationSettings: vi.fn(),
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
    variableInterval: false,
    quietHoursEnabled: true,
    quietHoursStart: "00:00",
    quietHoursEnd: "06:00",
    updateNotificationsEnabled: false,
    notificationPermissionGranted: true,
    status: "idle",
    message: "",
    lastSyncAt: "",
    lastAttemptAt: "",
  };
  native.getStatus.mockReset().mockImplementation(async () => ({ ...native.status }));
  native.openAppSettings.mockReset().mockResolvedValue(undefined);
  native.setEnabled.mockReset().mockImplementation(async (enabled, intervalMinutes) => {
    native.status = { ...native.status, enabled, intervalMinutes };
  });
  native.setQuietHours.mockReset().mockImplementation(async (enabled, startTime, endTime) => {
    native.status = {
      ...native.status,
      quietHoursEnabled: enabled,
      quietHoursStart: startTime,
      quietHoursEnd: endTime,
    };
  });
  native.setUpdateNotifications.mockReset().mockImplementation(async (enabled) => {
    native.status = {
      ...native.status,
      updateNotificationsEnabled: enabled,
      notificationPermissionGranted: true,
    };
    return { enabled, permissionGranted: true };
  });
  native.clear.mockReset();
  native.saveCredentials.mockReset();
  native.syncNow.mockReset();
});

afterEach(() => cleanup());

describe("toggle sincronizzazione DidUP", () => {
  it("apre le impostazioni Android dell’app per permettere all’utente di togliere restrizioni batteria", async () => {
    render(<DidupSyncSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Apri impostazioni app Android" }));

    await waitFor(() => expect(native.openAppSettings).toHaveBeenCalledOnce());
  });

  it("attiva gli avvisi locali quando l’utente abilita le notifiche", async () => {
    render(<DidupSyncSettings />);
    fireEvent.click(await screen.findByRole("button", { name: "Attiva avvisi" }));

    await waitFor(() => expect(native.setUpdateNotifications).toHaveBeenCalledWith(true));
    expect(await screen.findByText(/Attivi: VOTO avviserà/)).toBeInTheDocument();
  });

  it("mostra se è attiva o sospesa e aggiorna subito lo stato quando si tocca", async () => {
    render(<DidupSyncSettings />);
    const toggle = await screen.findByRole("switch", {
      name: "Sincronizzazione periodica DidUP",
    });

    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Sospesa")).toBeInTheDocument();
    expect(
      screen.getByText("Controllo periodico sospeso · ogni 6 ore · pausa 00:00–06:00"),
    ).toBeInTheDocument();

    fireEvent.click(toggle);

    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(native.setEnabled).toHaveBeenCalledWith(true, 360, false);
    expect(screen.getByText("Attiva")).toBeInTheDocument();
    expect(
      screen.getByText("Controllo periodico attivo · ogni 6 ore · pausa 00:00–06:00"),
    ).toBeInTheDocument();

    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "false"));
    expect(native.setEnabled).toHaveBeenLastCalledWith(false, 360, false);
  });

  it("mostra il warning allegati anche se i dati generali sono stati sincronizzati", async () => {
    native.status = {
      ...native.status,
      status: "attachment_issue",
      message: "Allegato: download non riuscito (HTTP 403).",
      lastSyncAt: "2026-11-18T18:00:00Z",
    };
    render(<DidupSyncSettings />);

    expect(await screen.findByText("Verifica un allegato")).toBeInTheDocument();
    expect(screen.getByText("Allegato: download non riuscito (HTTP 403).")).toBeInTheDocument();
    expect(screen.queryByText("Sincronizzazione riuscita")).not.toBeInTheDocument();
  });

  it("aggiorna lo stato quando il worker completa un lotto in background", async () => {
    native.status = { ...native.status, status: "attachment_pending" };
    render(<DidupSyncSettings />);

    expect(await screen.findByText("Allegati in coda")).toBeInTheDocument();
    native.status = {
      ...native.status,
      status: "success",
      message: "Sincronizzazione completata.",
    };
    fireEvent.focus(window);

    expect(await screen.findByText("Sincronizzazione riuscita")).toBeInTheDocument();
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

  it("salva un intervallo personalizzato che attraversa la mezzanotte", async () => {
    render(<DidupSyncSettings />);
    await screen.findByRole("switch", { name: "Sincronizzazione periodica DidUP" });

    fireEvent.change(screen.getByLabelText("Non controllare dalle"), {
      target: { value: "23:00" },
    });
    fireEvent.change(screen.getByLabelText("Fino alle"), { target: { value: "07:00" } });
    fireEvent.click(screen.getByRole("button", { name: "Applica fascia oraria" }));

    await waitFor(() => {
      expect(native.setQuietHours).toHaveBeenCalledWith(true, "23:00", "07:00");
    });
    expect(
      screen.getByText("Controllo periodico sospeso · ogni 6 ore · pausa 23:00–07:00"),
    ).toBeInTheDocument();
  });
});
