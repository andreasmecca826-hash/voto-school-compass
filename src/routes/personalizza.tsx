import { createFileRoute } from "@tanstack/react-router";
import { PersonalizationPanel } from "@/components/voto/PersonalizationPanel";

export const Route = createFileRoute("/personalizza")({
  head: () => ({
    meta: [
      { title: "Personalizza — VOTO." },
      { name: "description", content: "Personalizza temi e Home di VOTO." },
    ],
  }),
  component: Personalizza,
});

function Personalizza() {
  return <PersonalizationPanel />;
}
