import { PeriodPicker } from "./PeriodPicker";
import { BottomSheet } from "./ui";
import { SimulatorTool } from "./SimulatorTool";

export function SimulatorSheet({
  open,
  onOpenChange,
  subjectId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId?: string | undefined;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Simulatore voti"
      description="Prova possibili risultati senza modificare il registro."
    >
      <PeriodPicker />
      <SimulatorTool subjectId={subjectId} />
    </BottomSheet>
  );
}
