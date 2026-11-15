import { useSyncExternalStore } from "react";
//#region src/lib/voto/use-online-status.ts
function subscribe(onStoreChange) {
	if (typeof window === "undefined") return () => {};
	window.addEventListener("online", onStoreChange);
	window.addEventListener("offline", onStoreChange);
	return () => {
		window.removeEventListener("online", onStoreChange);
		window.removeEventListener("offline", onStoreChange);
	};
}
function getSnapshot() {
	return typeof navigator === "undefined" || navigator.onLine;
}
function getServerSnapshot() {
	return true;
}
function useOnlineStatus() {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
//#endregion
export { useOnlineStatus as t };
