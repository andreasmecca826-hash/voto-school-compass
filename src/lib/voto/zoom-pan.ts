import type { MutableRefObject, PointerEvent as ReactPointerEvent } from "react";

export interface ZoomPanState {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, a, input, textarea, select"));
}

export function beginZoomPan(
  event: ReactPointerEvent<HTMLDivElement>,
  zoom: number,
  stateRef: MutableRefObject<ZoomPanState | null>,
) {
  if (zoom <= 1 || event.pointerType === "touch" || isInteractiveTarget(event.target)) return;

  stateRef.current = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: event.currentTarget.scrollLeft,
    scrollTop: event.currentTarget.scrollTop,
  };
  if (Number.isFinite(event.pointerId)) event.currentTarget.setPointerCapture?.(event.pointerId);
}

export function moveZoomPan(
  event: ReactPointerEvent<HTMLDivElement>,
  stateRef: MutableRefObject<ZoomPanState | null>,
) {
  const state = stateRef.current;
  if (event.pointerType === "touch" || !state || state.pointerId !== event.pointerId) return;
  event.preventDefault();
  event.currentTarget.scrollLeft = state.scrollLeft - (event.clientX - state.startX);
  event.currentTarget.scrollTop = state.scrollTop - (event.clientY - state.startY);
}

export function endZoomPan(
  event: ReactPointerEvent<HTMLDivElement>,
  stateRef: MutableRefObject<ZoomPanState | null>,
) {
  if (stateRef.current?.pointerId === event.pointerId) stateRef.current = null;
}
