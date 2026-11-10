import type {
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  TouchEvent as ReactTouchEvent,
} from "react";

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
  if (zoom <= 1 || isInteractiveTarget(event.target)) return;

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
  if (!state || state.pointerId !== event.pointerId) return;
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

export function beginZoomTouch(
  event: ReactTouchEvent<HTMLDivElement>,
  zoom: number,
  stateRef: MutableRefObject<ZoomPanState | null>,
) {
  const touch = event.touches[0];
  if (zoom <= 1 || !touch || isInteractiveTarget(event.target)) return;

  stateRef.current = {
    pointerId: -1,
    startX: touch.clientX,
    startY: touch.clientY,
    scrollLeft: event.currentTarget.scrollLeft,
    scrollTop: event.currentTarget.scrollTop,
  };
}

export function moveZoomTouch(
  event: ReactTouchEvent<HTMLDivElement>,
  stateRef: MutableRefObject<ZoomPanState | null>,
) {
  const state = stateRef.current;
  const touch = event.touches[0];
  if (!state || state.pointerId !== -1 || !touch) return;
  event.preventDefault();
  event.currentTarget.scrollLeft = state.scrollLeft - (touch.clientX - state.startX);
  event.currentTarget.scrollTop = state.scrollTop - (touch.clientY - state.startY);
}

export function endZoomTouch(stateRef: MutableRefObject<ZoomPanState | null>) {
  if (stateRef.current?.pointerId === -1) stateRef.current = null;
}
