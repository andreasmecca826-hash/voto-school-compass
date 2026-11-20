import { createFileRoute } from "@tanstack/react-router";
import { StudyToolsShop } from "@/components/voto/StudyToolsShop";

export const Route = createFileRoute("/negozio")({
  head: () => ({
    meta: [
      { title: "Negozio strumenti — VOTO." },
      {
        name: "description",
        content:
          "Strumenti digitali per Informatica ed Elettronica, scelti per il tuo indirizzo scolastico.",
      },
      { property: "og:title", content: "Negozio strumenti — VOTO." },
      {
        property: "og:description",
        content: "Un catalogo di strumenti digitali per il tuo indirizzo scolastico.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudyToolsShop,
});
