import { t as cn } from "./utils-C_uf36nf.js";
import { CircularViewer } from "./CircularViewer-Bbrp2Uts.js";
import { r as useVoto } from "./store-EhdD6Ug3.js";
import { n as fmtDate } from "./dates-CdBXaUB1.js";
import { n as Chip, r as Empty, t as BottomSheet } from "./ui-D03OlNCN.js";
import { t as NOTIF_META } from "./notification-meta-C26fazoY.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { CheckCheck, Newspaper } from "lucide-react";
//#region src/components/voto/NotificationsSheet.tsx
function NotificationsSheet({ open, onOpenChange }) {
	const v = useVoto();
	const [filter, setFilter] = useState("all");
	const visibleNotifications = v.data.notifications;
	const [circular, setCircular] = useState(null);
	const list = [...visibleNotifications].filter((n) => filter === "all" || n.type === filter).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
	const unreadIds = visibleNotifications.filter((n) => !v.isRead(n.id, n.read)).map((n) => n.id);
	return /* @__PURE__ */ jsxs(BottomSheet, {
		open,
		onOpenChange,
		title: "Novità",
		description: `${unreadIds.length} non lette`,
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "no-scrollbar -mx-5 mb-4 flex gap-2 overflow-x-auto px-5",
				children: [/* @__PURE__ */ jsx(Chip, {
					active: filter === "all",
					onClick: () => setFilter("all"),
					children: "Tutte"
				}), Object.keys(NOTIF_META).map((t) => /* @__PURE__ */ jsx(Chip, {
					active: filter === t,
					onClick: () => setFilter(t),
					children: NOTIF_META[t].label
				}, t))]
			}),
			/* @__PURE__ */ jsxs("button", {
				type: "button",
				disabled: !unreadIds.length,
				onClick: () => v.markRead(unreadIds),
				className: "press mb-4 inline-flex h-9 items-center gap-2 rounded-lg text-xs font-medium text-primary disabled:text-muted-foreground",
				children: [/* @__PURE__ */ jsx(CheckCheck, { className: "h-4 w-4" }), " Segna tutte come lette"]
			}),
			list.length === 0 ? /* @__PURE__ */ jsx(Empty, {
				icon: /* @__PURE__ */ jsx(Newspaper, { className: "h-6 w-6" }),
				title: "Nessuna novità",
				text: "Qui compariranno voti, note e promemoria."
			}) : /* @__PURE__ */ jsx("ul", {
				className: "space-y-2",
				children: list.map((n) => {
					const read = v.isRead(n.id, n.read);
					const M = NOTIF_META[n.type];
					return /* @__PURE__ */ jsxs("li", {
						className: cn("card-surface flex gap-3 p-3.5", !read && "border-primary/30"),
						children: [/* @__PURE__ */ jsx("span", {
							className: cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface", !read && "text-primary"),
							children: /* @__PURE__ */ jsx(M.icon, { className: "h-4 w-4" })
						}), /* @__PURE__ */ jsxs("div", {
							className: "min-w-0 flex-1",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2 text-[11px] text-muted-foreground",
									children: [
										/* @__PURE__ */ jsx("span", { children: M.label }),
										n.subject && /* @__PURE__ */ jsxs("span", { children: ["· ", n.subject] }),
										n.date && /* @__PURE__ */ jsx("span", {
											className: "ml-auto",
											children: fmtDate(n.date)
										})
									]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-0.5 text-sm font-medium",
									children: n.title
								}),
								n.message && /* @__PURE__ */ jsx("p", {
									className: "mt-0.5 text-xs text-muted-foreground",
									children: n.message
								}),
								n.type === "notice" && /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => {
										setCircular(n);
										if (!read) v.markRead([n.id]);
									},
									className: "press mt-2 inline-flex max-w-full rounded-lg bg-primary-soft px-2.5 py-1.5 text-[11px] font-semibold text-primary",
									children: "Apri circolare"
								}),
								!read && /* @__PURE__ */ jsx("button", {
									type: "button",
									onClick: () => v.markRead([n.id]),
									className: "mt-2 text-xs font-medium text-primary",
									children: "Segna come letta"
								})
							]
						})]
					}, n.id);
				})
			}),
			circular && /* @__PURE__ */ jsx(CircularViewer, {
				open: !!circular,
				onOpenChange: (open) => !open && setCircular(null),
				title: circular.message ?? circular.title,
				fileName: circular.attachmentName,
				path: circular.attachmentPath,
				attachments: circular.attachments,
				url: circular.attachmentPath ? circular.attachmentUrl : void 0
			})
		]
	});
}
//#endregion
export { NotificationsSheet };
