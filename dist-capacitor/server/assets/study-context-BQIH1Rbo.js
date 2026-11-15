import { createContext, useContext, useState } from "react";
import { jsx } from "react/jsx-runtime";
//#region src/lib/voto/study-context.tsx
var Context = createContext(null);
function StudyProvider({ children }) {
	const [cards, setCards] = useState([]);
	return /* @__PURE__ */ jsx(Context.Provider, {
		value: {
			cards,
			setCards
		},
		children
	});
}
function useStudy() {
	const state = useContext(Context);
	if (!state) throw new Error("StudyProvider mancante");
	return state;
}
//#endregion
export { useStudy as n, StudyProvider as t };
