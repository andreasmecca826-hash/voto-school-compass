import { t as cn } from "./utils-C_uf36nf.js";
import { a as SheetTitle, i as SheetHeader, n as SheetContent, r as SheetDescription, t as Sheet } from "./sheet-D410YndM.js";
import { a as gradeTone, i as fmt } from "./calc-DWBiEBUY.js";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/voto/ui.tsx
function BottomSheet({ open, onOpenChange, title, description, children }) {
	return /* @__PURE__ */ jsx(Sheet, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(SheetContent, {
			side: "bottom",
			className: "mx-auto max-h-[88dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl border-border bg-popover px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "mx-auto mb-4 h-1 w-10 rounded-full bg-muted",
					"aria-hidden": true
				}),
				/* @__PURE__ */ jsxs(SheetHeader, {
					className: "mb-4 text-left",
					children: [/* @__PURE__ */ jsx(SheetTitle, {
						className: "font-display text-xl tracking-tight",
						children: title
					}), description && /* @__PURE__ */ jsx(SheetDescription, { children: description })]
				}),
				children
			]
		})
	});
}
function SubjectMark({ name, color, size = 40 }) {
	const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
	return /* @__PURE__ */ jsxs("span", {
		className: "relative inline-flex shrink-0 items-center justify-center rounded-xl bg-surface font-display text-xs font-semibold text-foreground",
		style: {
			width: size,
			height: size
		},
		"aria-hidden": true,
		children: [initials, /* @__PURE__ */ jsx("span", {
			className: "absolute bottom-1.5 h-0.5 w-3 rounded-full",
			style: { background: color ?? "currentColor" }
		})]
	});
}
function GradePill({ value, label, className }) {
	const tone = gradeTone(value);
	return /* @__PURE__ */ jsx("span", {
		className: cn("tabular inline-flex min-w-11 items-center justify-center rounded-lg px-2 py-1 font-display text-sm font-semibold", tone === "bad" && "bg-danger-soft text-danger", tone === "good" && "bg-success-soft text-success", tone === "ok" && "bg-warning/15 text-warning", tone === "muted" && "bg-surface text-muted-foreground", className),
		children: label ?? (value === null ? "—" : fmt(value, 2))
	});
}
function Chip({ children, active, onClick, className }) {
	return /* @__PURE__ */ jsx(onClick ? "button" : "span", {
		type: onClick ? "button" : void 0,
		onClick,
		"aria-pressed": onClick ? !!active : void 0,
		className: cn("press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", active ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-card text-muted-foreground", onClick && !active && "hover:text-foreground", className),
		children
	});
}
function SectionTitle({ children, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "mb-3 mt-8 flex items-baseline justify-between",
		children: [/* @__PURE__ */ jsx("h2", {
			className: "font-display text-[15px] font-semibold tracking-tight",
			children
		}), action]
	});
}
function Empty({ icon, title, text }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "card-surface flex flex-col items-center px-6 py-10 text-center",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "mb-3 text-muted-foreground",
				children: icon
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-sm font-medium",
				children: title
			}),
			text && /* @__PURE__ */ jsx("p", {
				className: "mt-1 max-w-xs text-xs text-muted-foreground",
				children: text
			})
		]
	});
}
function Sparkline({ values, className }) {
	if (values.length < 2) return /* @__PURE__ */ jsx("div", { className: cn("h-12", className) });
	const w = 140, h = 48, p = 4;
	const min = Math.min(...values) - .2, max = Math.max(...values) + .2;
	const pts = values.map((v, i) => {
		return [p + i * 132 / (values.length - 1), 44 - (v - min) / (max - min) * 40];
	});
	const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
	const last = pts[pts.length - 1];
	const first = pts[0];
	return /* @__PURE__ */ jsxs("svg", {
		viewBox: `0 0 ${w} ${h}`,
		className: cn("h-12 w-[140px] text-primary", className),
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ jsx("path", {
				d: `${d} L${last[0]},${h} L${first[0]},${h} Z`,
				fill: "currentColor",
				opacity: "0.08"
			}),
			/* @__PURE__ */ jsx("path", {
				d,
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.75",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ jsx("circle", {
				cx: last[0],
				cy: last[1],
				r: "3",
				fill: "currentColor"
			})
		]
	});
}
function ProgressBar({ value, color }) {
	return /* @__PURE__ */ jsx("div", {
		className: "h-1 w-full overflow-hidden rounded-full bg-surface",
		children: /* @__PURE__ */ jsx("div", {
			className: "h-full rounded-full bg-primary transition-all duration-500",
			style: {
				width: `${Math.max(0, Math.min(100, value))}%`,
				background: color
			}
		})
	});
}
//#endregion
export { ProgressBar as a, SubjectMark as c, GradePill as i, Chip as n, SectionTitle as o, Empty as r, Sparkline as s, BottomSheet as t };
