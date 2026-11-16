import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppIconPanel } from "@/components/voto/AppIconPanel";

const {
  chooseCustomAppIcon,
  getAppIcon,
  isAndroidAppIconSupported,
  setAppIcon,
  setCustomAppIconName,
  setCustomShortcutNameVisibility,
} = vi.hoisted(() => ({
  chooseCustomAppIcon: vi.fn(),
  getAppIcon: vi.fn(),
  isAndroidAppIconSupported: vi.fn(),
  setAppIcon: vi.fn(),
  setCustomAppIconName: vi.fn(),
  setCustomShortcutNameVisibility: vi.fn(),
}));

vi.mock("@/lib/voto/app-icon", () => ({
  APP_ICONS: [
    { id: "voto", label: "VOTO", description: "Icona originale" },
    { id: "famiglia", label: "didUP", description: "Studenti e famiglia" },
    { id: "classeviva", label: "ClasseViva", description: "Studenti e famiglie" },
  ],
  APP_ICON_LABELS: [
    { id: "voto", label: "VOTO" },
    { id: "didup-famiglia", label: "didUP Famiglia" },
    { id: "classeviva", label: "ClasseViva Studenti e Famiglie" },
  ],
  chooseCustomAppIcon,
  getAppIcon,
  isAndroidAppIconSupported,
  setAppIcon,
  setCustomAppIconName,
  setCustomShortcutNameVisibility,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("selettore dell’icona dell’app", () => {
  beforeEach(() => {
    isAndroidAppIconSupported.mockReturnValue(true);
    getAppIcon.mockResolvedValue({
      icon: "voto",
      label: "voto",
      galleryShortcutSupported: true,
      customShortcutPinned: false,
      customShortcutName: "VOTO",
      customShortcutNameHidden: false,
    });
    setAppIcon.mockResolvedValue(undefined);
    setCustomAppIconName.mockResolvedValue(undefined);
    setCustomShortcutNameVisibility.mockResolvedValue(undefined);
    chooseCustomAppIcon.mockResolvedValue({ status: "cancelled", name: "VOTO" });
  });

  it("spiega che il cambio non è disponibile nel browser", async () => {
    isAndroidAppIconSupported.mockReturnValue(false);
    render(<AppIconPanel onBack={vi.fn()} />);

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Nel browser non è possibile cambiare",
    );
    expect(screen.getByRole("button", { name: /didUP Studenti e famiglia/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "didUP Famiglia" })).toBeDisabled();
    expect(getAppIcon).not.toHaveBeenCalled();
  });

  it("mantiene l’icona salvata e applica l’etichetta fissa selezionata", async () => {
    getAppIcon.mockResolvedValue({
      icon: "famiglia",
      label: "voto",
      galleryShortcutSupported: true,
      customShortcutPinned: false,
      customShortcutName: "VOTO",
      customShortcutNameHidden: false,
    });
    render(<AppIconPanel onBack={vi.fn()} />);

    const familyButton = screen.getByRole("button", { name: /didUP Studenti e famiglia/ });
    await waitFor(() => expect(familyButton).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(screen.getByRole("button", { name: "didUP Famiglia" }));
    await waitFor(() => expect(setAppIcon).toHaveBeenCalledWith("famiglia", "didup-famiglia"));
    expect(screen.getByRole("button", { name: /didUP Famiglia/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("richiede la conferma del launcher per il primo collegamento personalizzato", async () => {
    const imageDataUrl = "data:image/png;base64,AA==";
    chooseCustomAppIcon.mockResolvedValue({
      status: "requested",
      name: "Scuola Mia",
      customIconDataUrl: imageDataUrl,
    });
    render(<AppIconPanel onBack={vi.fn()} />);

    const nameInput = screen.getByLabelText("Testo mostrato sotto il collegamento Home");
    await waitFor(() => expect(nameInput).not.toBeDisabled());
    fireEvent.change(nameInput, {
      target: { value: "Scuola Mia" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Scegli immagine" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "In attesa della conferma del launcher",
    );
    expect(chooseCustomAppIcon).toHaveBeenCalledWith("Scuola Mia");
    expect(screen.getByAltText("Anteprima dell’icona personalizzata")).toHaveAttribute(
      "src",
      imageDataUrl,
    );
  });

  it("aggiorna il testo di un collegamento personale già presente", async () => {
    getAppIcon.mockResolvedValue({
      icon: "voto",
      label: "voto",
      galleryShortcutSupported: true,
      customShortcutPinned: true,
      customShortcutName: "VOTO",
      customShortcutNameHidden: false,
    });
    render(<AppIconPanel onBack={vi.fn()} />);

    const nameInput = screen.getByLabelText("Testo mostrato sotto il collegamento Home");
    await waitFor(() => expect(nameInput).not.toBeDisabled());
    fireEvent.change(nameInput, { target: { value: "VOTO Casa" } });
    fireEvent.click(screen.getByRole("button", { name: "Salva nome" }));

    await waitFor(() => expect(setCustomAppIconName).toHaveBeenCalledWith("VOTO Casa"));
  });

  it("permette di nascondere il testo senza sostituire l’icona del collegamento", async () => {
    render(<AppIconPanel onBack={vi.fn()} />);
    const hideName = screen.getByRole("checkbox", {
      name: "Nascondi il testo sotto il collegamento",
    });
    await waitFor(() => expect(hideName).not.toBeDisabled());

    fireEvent.click(hideName);
    await waitFor(() => expect(setCustomShortcutNameVisibility).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("checkbox", { name: /Nascondi l’icona/ })).not.toBeInTheDocument();
  });
});
