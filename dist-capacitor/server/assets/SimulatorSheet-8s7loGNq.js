import { t as BottomSheet } from "./ui-D03OlNCN.js";
import { t as PeriodPicker } from "./PeriodPicker-ALqNKIz5.js";
import { t as SimulatorTool } from "./SimulatorTool-OTmfs9vu.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/voto/SimulatorSheet.tsx
function SimulatorSheet({ open, onOpenChange, subjectId }) {
	return /* @__PURE__ */ jsxs(BottomSheet, {
		open,
		onOpenChange,
		title: "Simulatore voti",
		description: "Prova possibili risultati senza modificare il registro.",
		children: [/* @__PURE__ */ jsx(PeriodPicker, {}), /* @__PURE__ */ jsx(SimulatorTool, { subjectId })]
	});
}
//#endregion
export { SimulatorSheet };
