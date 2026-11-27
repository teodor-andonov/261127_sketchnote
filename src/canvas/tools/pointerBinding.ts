import { getPointerPosition, shouldHandlePointer } from "../../utils/pointer";

export type PointerToolHandlers = {
  onStart: (event: PointerEvent, point: { x: number; y: number }) => void;
  onMove: (event: PointerEvent, point: { x: number; y: number }) => void;
  onEnd: (event: PointerEvent, point: { x: number; y: number }) => void;
  onCancel: (event: PointerEvent) => void;
};

type PointerBindingOptions = {
  canvas: HTMLCanvasElement;
  root: Element | null;
  penOnlyMode: boolean;
  handlers: PointerToolHandlers;
};

function isFromCanvas(canvas: HTMLCanvasElement, event: PointerEvent): boolean {
  if (event.target === canvas) return true;
  if (typeof event.composedPath !== "function") return false;
  return event.composedPath().includes(canvas);
}

function isInsideCanvas(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): boolean {
  const rect = canvas.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

function isInRoot(root: Element | null, event: PointerEvent): boolean {
  if (!root) return true;
  const target = event.target as Node | null;
  return !!target && root.contains(target);
}

function isInCanvasLayer(canvas: HTMLCanvasElement, event: PointerEvent): boolean {
  const layer = canvas.closest(".sketchpad-canvas-layer");
  if (!layer) return true;
  if (typeof event.composedPath === "function") {
    return event.composedPath().includes(layer);
  }
  const target = event.target as Node | null;
  return !!target && layer.contains(target);
}

export function bindPointerTool({
  canvas,
  root,
  penOnlyMode,
  handlers,
}: PointerBindingOptions): () => void {
  const ownerWindow = canvas.ownerDocument.defaultView ?? window;
  const doc = ownerWindow.document;

  const handleCanvasDown = (event: PointerEvent) => {
    if (!isInRoot(root, event)) return;
    if (!shouldHandlePointer(event, penOnlyMode)) return;
    handlers.onStart(event, getPointerPosition(canvas, event));
  };

  const handleCanvasMove = (event: PointerEvent) => {
    if (!isInRoot(root, event)) return;
    if (!shouldHandlePointer(event, penOnlyMode)) return;
    handlers.onMove(event, getPointerPosition(canvas, event));
  };

  const handleCanvasUp = (event: PointerEvent) => {
    handlers.onEnd(event, getPointerPosition(canvas, event));
  };

  const handleWindowDown = (event: PointerEvent) => {
    if (!isInRoot(root, event)) return;
    if (!isInCanvasLayer(canvas, event)) return;
    if (isFromCanvas(canvas, event)) return;
    if (!isInsideCanvas(canvas, event)) return;
    if (!shouldHandlePointer(event, penOnlyMode)) return;
    handlers.onStart(event, getPointerPosition(canvas, event));
  };

  const handleWindowMove = (event: PointerEvent) => {
    if (!isInRoot(root, event)) return;
    if (!isInCanvasLayer(canvas, event)) return;
    if (isFromCanvas(canvas, event)) return;
    if (!isInsideCanvas(canvas, event)) return;
    if (!shouldHandlePointer(event, penOnlyMode)) return;
    handlers.onMove(event, getPointerPosition(canvas, event));
  };

  const handleWindowUp = (event: PointerEvent) => {
    handlers.onEnd(event, getPointerPosition(canvas, event));
  };

  const handleCancel = (event: Event) => {
    handlers.onCancel(event as PointerEvent);
  };

  canvas.addEventListener("pointerdown", handleCanvasDown);
  canvas.addEventListener("pointermove", handleCanvasMove);
  canvas.addEventListener("pointerup", handleCanvasUp);
  canvas.addEventListener("pointercancel", handleCanvasUp);
  canvas.addEventListener("lostpointercapture", handleCancel);
  ownerWindow.addEventListener("pointerup", handleWindowUp);
  ownerWindow.addEventListener("blur", handleCancel);
  ownerWindow.addEventListener("resize", handleCancel);
  ownerWindow.addEventListener("pointerdown", handleWindowDown);
  ownerWindow.addEventListener("pointermove", handleWindowMove);
  doc.addEventListener("pointerdown", handleWindowDown, true);
  doc.addEventListener("pointermove", handleWindowMove, true);
  doc.addEventListener("pointerup", handleWindowUp, true);

  return () => {
    canvas.removeEventListener("pointerdown", handleCanvasDown);
    canvas.removeEventListener("pointermove", handleCanvasMove);
    canvas.removeEventListener("pointerup", handleCanvasUp);
    canvas.removeEventListener("pointercancel", handleCanvasUp);
    canvas.removeEventListener("lostpointercapture", handleCancel);
    ownerWindow.removeEventListener("pointerup", handleWindowUp);
    ownerWindow.removeEventListener("blur", handleCancel);
    ownerWindow.removeEventListener("resize", handleCancel);
    ownerWindow.removeEventListener("pointerdown", handleWindowDown);
    ownerWindow.removeEventListener("pointermove", handleWindowMove);
    doc.removeEventListener("pointerdown", handleWindowDown, true);
    doc.removeEventListener("pointermove", handleWindowMove, true);
    doc.removeEventListener("pointerup", handleWindowUp, true);
  };
}
