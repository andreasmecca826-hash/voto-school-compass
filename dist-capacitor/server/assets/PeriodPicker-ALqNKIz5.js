import { n as useSchoolPeriods, r as periodLabels } from "./periods-context-BiByHTyY.js";
import { t as Button } from "./button-PJVP9td7.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CalendarRange, Settings2 } from "lucide-react";
//#region src/components/voto/PeriodPicker.tsx
function PeriodPicker() {
	const { config, update, years } = useSchoolPeriods();
	const [settings, setSettings] = useState(false);
	const labels = periodLabels(config.system);
	return /* @__PURE__ */ jsxs("section", {
		className: "my-4 space-y-2",
		"aria-label": "Periodo scolastico",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2",
			children: [
				/* @__PURE__ */ jsx(CalendarRange, { className: "h-4 w-4 shrink-0 text-primary" }),
				/* @__PURE__ */ jsx("label", {
					className: "sr-only",
					htmlFor: "school-period",
					children: "Periodo"
				}),
				/* @__PURE__ */ jsx("select", {
					id: "school-period",
					value: config.selection,
					onChange: (e) => update({ selection: e.target.value }),
					className: "h-10 min-w-0 flex-1 rounded-lg border border-input bg-card px-2 text-xs font-semibold",
					children: Object.entries(labels).map(([value, label]) => /* @__PURE__ */ jsx("option", {
						value,
						children: label
					}, value))
				}),
				/* @__PURE__ */ jsx("select", {
					"aria-label": "Anno scolastico",
					value: config.year,
					onChange: (e) => update({ year: Number(e.target.value) }),
					className: "h-10 max-w-28 rounded-lg border border-input bg-card px-2 text-xs",
					children: years.map((year) => /* @__PURE__ */ jsxs("option", {
						value: year,
						children: [
							year,
							"/",
							String(year + 1).slice(2)
						]
					}, year))
				}),
				/* @__PURE__ */ jsx(Button, {
					size: "icon",
					variant: "ghost",
					"aria-label": "Configura periodi",
					title: "Configura periodi",
					"aria-expanded": settings,
					onClick: () => setSettings(!settings),
					children: /* @__PURE__ */ jsx(Settings2, {})
				})
			]
		}), settings && /* @__PURE__ */ jsxs("div", {
			className: "space-y-3 border-y border-border py-3",
			children: [/* @__PURE__ */ jsxs("label", {
				className: "block text-xs text-muted-foreground",
				children: ["Suddivisione", /* @__PURE__ */ jsxs("select", {
					value: config.system,
					onChange: (e) => update({ system: e.target.value }),
					className: "mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm",
					children: [/* @__PURE__ */ jsx("option", {
						value: "quadrimesters",
						children: "Due quadrimestri"
					}), /* @__PURE__ */ jsx("option", {
						value: "trimester",
						children: "Trimestre e pentamestre"
					})]
				})]
			}), /* @__PURE__ */ jsxs("label", {
				className: "block text-xs text-muted-foreground",
				children: ["Ultimo giorno del primo periodo", /* @__PURE__ */ jsx("input", {
					type: "date",
					"aria-label": "Fine primo periodo",
					min: `${config.year}-09-01`,
					max: `${config.year + 1}-08-30`,
					value: config.boundary,
					onChange: (e) => update({ boundary: e.target.value }),
					className: "mt-1 h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
				})]
			})]
		})]
	});
}
//#endregion
export { PeriodPicker as t };
