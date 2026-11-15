import { t as cn } from "./utils-C_uf36nf.js";
import { n as useClock, r as useVoto } from "./store-EhdD6Ug3.js";
import { o as relDay, t as daysBetween } from "./dates-CdBXaUB1.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { Check, Clock } from "lucide-react";
//#region src/components/voto/AssignmentRow.tsx
function AssignmentRow({ a }) {
	const v = useVoto();
	const now = useClock();
	const done = v.isDone(a.id, a.completed);
	const diff = a.dueDate ? daysBetween(now, a.dueDate) : null;
	const overdue = !done && diff !== null && diff < 0;
	const urgent = !done && diff !== null && diff >= 0 && diff <= 1;
	return /* @__PURE__ */ jsxs("li", {
		className: cn("card-surface flex items-start gap-3 p-3.5 transition-opacity", done && "opacity-55"),
		children: [/* @__PURE__ */ jsx("button", {
			type: "button",
			role: "checkbox",
			"aria-checked": done,
			"aria-label": `Segna "${a.title}" come ${done ? "da fare" : "completato"}`,
			onClick: () => v.toggleDone(a.id, a.completed),
			className: cn("press mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2", done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"),
			children: done && /* @__PURE__ */ jsx(Check, {
				className: "h-3.5 w-3.5",
				strokeWidth: 3
			})
		}), /* @__PURE__ */ jsxs("div", {
			className: "min-w-0 flex-1",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: cn("text-sm font-medium", done && "line-through"),
					children: a.title
				}),
				a.details && /* @__PURE__ */ jsx("p", {
					className: "mt-0.5 text-xs text-muted-foreground",
					children: a.details
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground",
					children: [
						a.subject && /* @__PURE__ */ jsx("span", {
							className: "rounded-md bg-surface px-1.5 py-0.5",
							children: a.subject
						}),
						/* @__PURE__ */ jsxs("span", {
							className: cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5", overdue ? "bg-danger-soft text-danger" : urgent ? "bg-primary-soft text-primary" : "bg-surface"),
							children: [
								/* @__PURE__ */ jsx(Clock, { className: "h-3 w-3" }),
								overdue ? "Scaduto · " : "",
								relDay(now, a.dueDate),
								a.dueTime ? ` · ${a.dueTime}` : ""
							]
						}),
						done && /* @__PURE__ */ jsx("span", {
							className: "text-success",
							children: "Completato"
						})
					]
				})
			]
		})]
	});
}
//#endregion
export { AssignmentRow as t };
