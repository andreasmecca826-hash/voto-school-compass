import { AlertCircle, Clock, GraduationCap, Megaphone } from "lucide-react";
//#region src/lib/voto/notification-meta.ts
var NOTIF_META = {
	note: {
		label: "Nota",
		icon: AlertCircle
	},
	grade: {
		label: "Voto",
		icon: GraduationCap
	},
	reminder: {
		label: "Promemoria",
		icon: Clock
	},
	notice: {
		label: "Avviso",
		icon: Megaphone
	}
};
//#endregion
export { NOTIF_META as t };
