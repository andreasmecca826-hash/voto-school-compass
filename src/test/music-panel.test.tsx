import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MusicPanel } from "@/components/voto/MusicPanel";

vi.mock("@/lib/voto/music-storage", () => ({
  loadLocalTrack: vi.fn().mockResolvedValue(null),
  removeLocalTrack: vi.fn().mockResolvedValue(undefined),
  saveLocalTrack: vi.fn().mockResolvedValue(undefined),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("player Spotify", () => {
  it("incorpora un link condiviso e non lo passa al tag audio", async () => {
    const { container } = render(<MusicPanel open onClose={vi.fn()} />);
    const input = screen.getByRole("textbox", { name: "URL del brano audio" });
    fireEvent.change(input, {
      target: { value: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b?si=test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Usa" }));

    const iframe = await screen.findByTitle("Player Spotify");
    await waitFor(() =>
      expect(iframe).toHaveAttribute(
        "src",
        "https://open.spotify.com/embed/track/0VjIjW4GlUZAMYd2vXMi3b?utm_source=generator&theme=0",
      ),
    );
    expect(container.querySelector("audio")).not.toHaveAttribute("src");
    expect(
      screen.getByText("Link Spotify riconosciuto: usa i controlli del player incorporato."),
    ).toBeInTheDocument();
  });
});
