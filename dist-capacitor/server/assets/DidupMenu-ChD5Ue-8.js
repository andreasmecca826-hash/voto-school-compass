import { t as cn } from "./utils-C_uf36nf.js";
import { i as useVotoData } from "./store-EhdD6Ug3.js";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { AlarmClock, Backpack, BookOpenText, CalendarCheck2, CalendarX2, ClipboardList, FilePenLine, MessageSquareText, NotebookTabs, Palette, Settings, UsersRound } from "lucide-react";
//#region src/components/voto/DidupMenu.tsx
var ITEMS = [
	{
		label: "Eventi appello",
		color: "#00a4b8",
		icon: CalendarX2,
		iconImage: "/didup-menu-icons/eventi-appello.png",
		to: "/eventi-appello"
	},
	{
		label: "Note",
		color: "#faad91",
		icon: FilePenLine,
		iconImage: "/didup-menu-icons/note.png",
		to: "/note"
	},
	{
		label: "Voti giornalieri",
		color: "#da6a56",
		icon: BookOpenText,
		iconImage: "/didup-menu-icons/voti-giornalieri.png",
		to: "/voti"
	},
	{
		label: "Voti scrutini",
		color: "#996bce",
		icon: NotebookTabs,
		iconImage: "/didup-menu-icons/voti-scrutini.png",
		to: "/scrutini-infraperiodali"
	},
	{
		label: "Attività svolta",
		color: "#3688d1",
		icon: MessageSquareText,
		iconImage: "/didup-menu-icons/attivita-svolta.png",
		to: "/diario"
	},
	{
		label: "Compiti assegnati",
		color: "#6a79f8",
		icon: Backpack,
		iconImage: "/didup-menu-icons/compiti-assegnati.png",
		to: "/compiti"
	},
	{
		label: "Promemoria",
		color: "#ff565d",
		icon: CalendarCheck2,
		iconImage: "/didup-menu-icons/promemoria.png",
		to: "/promemoria"
	},
	{
		label: "Orario",
		color: "#f4b0c7",
		icon: AlarmClock,
		iconImage: "/didup-menu-icons/orario.png",
		to: "/orario"
	},
	{
		label: "Condivisione",
		color: "#8ab971",
		icon: UsersRound,
		iconImage: "/didup-menu-icons/condivisione.png",
		to: "/professori"
	},
	{
		label: "Bacheca",
		color: "#00a4b8",
		icon: ClipboardList,
		iconImage: "/didup-menu-icons/bacheca.png",
		to: "/bacheca"
	},
	{
		label: "Personalizza",
		color: "#e3a63b",
		icon: Palette,
		iconImage: "/didup-menu-icons/personalizza.png",
		to: "/personalizza"
	},
	{
		label: "Impostazioni",
		color: "#3b75b8",
		icon: Settings,
		iconImage: "/didup-menu-icons/impostazioni.png",
		to: "/impostazioni"
	}
];
function DidupMenu() {
	const studentName = (useVotoData().data.student.name || "ANDREA MARIA").toUpperCase();
	return /* @__PURE__ */ jsxs("div", {
		className: "didup-page min-h-dvh bg-black pb-24 pl-2 text-white",
		children: [/* @__PURE__ */ jsxs("header", {
			className: "flex items-start justify-between pb-7 pl-4 pr-[7px] pt-4",
			children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
				className: "text-[26px] font-normal tracking-tight",
				children: "Menu"
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-white/75",
				children: studentName
			})] }), /* @__PURE__ */ jsx("img", {
				src: "/didup-profile.jpg",
				alt: "",
				"aria-hidden": "true",
				className: "h-12 w-12 object-cover"
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "grid grid-cols-2 gap-x-[15px] gap-y-[27px] pr-2",
			children: ITEMS.map((item) => {
				const Icon = item.icon;
				const content = /* @__PURE__ */ jsxs(Fragment, { children: [item.iconImage ? /* @__PURE__ */ jsx("img", {
					src: item.iconImage.endsWith(".png") ? item.iconImage.replace("/didup-menu-icons/", "/didup-menu-icons-no-gray/") : item.iconImage,
					alt: "",
					"aria-hidden": "true",
					className: "absolute right-0 top-0 h-9 w-9 select-none"
				}) : /* @__PURE__ */ jsxs("span", {
					"aria-hidden": "true",
					className: "absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-white",
					children: [/* @__PURE__ */ jsx("svg", {
						"aria-hidden": "true",
						viewBox: "0 0 36 36",
						className: "absolute inset-0 h-full w-full",
						focusable: "false",
						children: /* @__PURE__ */ jsx("path", {
							d: "M0 0h36v36H18A18 18 0 0 1 0 18V0Z",
							fill: item.color
						})
					}), /* @__PURE__ */ jsx(Icon, {
						className: "relative z-10 h-5 w-5",
						strokeWidth: 1.35
					})]
				}), /* @__PURE__ */ jsx("span", {
					className: "text-center text-[16px] font-bold leading-tight",
					children: item.label
				})] });
				const className = cn("didup-menu-card relative flex min-h-[93px] items-center justify-center overflow-hidden rounded-[9px] p-1", item.muted && "opacity-65");
				return item.to ? /* @__PURE__ */ jsx(Link, {
					to: item.to,
					className,
					children: content
				}, item.label) : /* @__PURE__ */ jsx("button", {
					type: "button",
					disabled: true,
					className,
					children: content
				}, item.label);
			})
		})]
	});
}
//#endregion
export { DidupMenu };
