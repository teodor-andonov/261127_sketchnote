import { clearCanvas, getCanvasContext } from "../../utils/canvas";
import {
  getPointerPosition,
  isPenLike,
  isPrimaryAction,
  releasePointer,
  releasePointerById,
  setPointerCapture,
  shouldHandlePointer,
} from "../../utils/pointer";
import { bindPointerTool } from "./pointerBinding";

type Point = { x: number; y: number };

export type EraserOptions = {
  size: number;
  penOnlyMode: boolean;
  previewEnabled: boolean;
  onCommit: () => void;
};

export function eraser(
  previewCanvas: HTMLCanvasElement,
  finalCanvas: HTMLCanvasElement,
  options: EraserOptions,
) {
  const previewCtx = getCanvasContext(previewCanvas);
  const finalCtx = getCanvasContext(finalCanvas, { willReadFrequently: true });
  if (!previewCtx || !finalCtx) return () => {};

  let isErasing = false;
  let activePointerId: number | null = null;
  let lastPoint: Point | null = null;
  const minDistance = Math.max(0.5, options.size / 4);

  const setCursor = (point: Point) => {
    if (!options.previewEnabled) return;
    clearCanvas(previewCanvas, previewCtx);
    const radius = Math.max(1, options.size / 2);
    previewCtx.save();
    previewCtx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    previewCtx.lineWidth = 1;
    previewCtx.beginPath();
    previewCtx.ellipse(point.x, point.y, radius, radius, 0, 0, 2 * Math.PI);
    previewCtx.stroke();
    previewCtx.restore();
  };

  const eraseDot = (point: Point) => {
    finalCtx.save();
    finalCtx.globalCompositeOperation = "destination-out";
    finalCtx.fillStyle = "rgba(0,0,0,1)";
    finalCtx.beginPath();
    finalCtx.ellipse(point.x, point.y, options.size / 2, options.size / 2, 0, 0, 2 * Math.PI);
    finalCtx.fill();
    finalCtx.restore();
  };

  const eraseSegment = (from: Point, to: Point) => {
    finalCtx.save();
    finalCtx.globalCompositeOperation = "destination-out";
    finalCtx.strokeStyle = "rgba(0,0,0,1)";
    finalCtx.lineCap = "round";
    finalCtx.lineJoin = "round";
    finalCtx.lineWidth = options.size;
    finalCtx.beginPath();
    finalCtx.moveTo(from.x, from.y);
    finalCtx.lineTo(to.x, to.y);
    finalCtx.stroke();
    finalCtx.restore();
  };

  const begin = (event: PointerEvent) => {
    isErasing = true;
    lastPoint = null;
    const point = getPointerPosition(previewCanvas, event);
    eraseDot(point);
    setCursor(point);
    lastPoint = point;
    setPointerCapture(previewCanvas, event);
    activePointerId = event.pointerId ?? null;
  };

  const start = (event: PointerEvent) => {
    if (!shouldHandlePointer(event, options.penOnlyMode)) return;
    const penLike = isPenLike(event);
    if (!isPrimaryAction(event, penLike)) return;
    event.preventDefault();
    begin(event);
  };

  const move = (event: PointerEvent) => {
    if (!shouldHandlePointer(event, options.penOnlyMode)) return;
    if (isErasing && activePointerId != null && event.pointerId !== activePointerId) return;
    const penLike = isPenLike(event);
    if (!penLike && event.isPrimary === false) return;
    const hasInput = penLike ? event.pressure > 0 || (event.buttons & 1) === 1 : (event.buttons & 1) === 1;
    if (!isErasing && hasInput && isPrimaryAction(event, penLike)) {
      event.preventDefault();
      begin(event);
    }
    const point = getPointerPosition(previewCanvas, event);
    setCursor(point);
    if (!isErasing || !lastPoint) return;
    event.preventDefault();
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    if (dx * dx + dy * dy < minDistance * minDistance) return;
    eraseSegment(lastPoint, point);
    lastPoint = point;
  };

  const end = (event: PointerEvent) => {
    if (!isErasing) return;
    event.preventDefault();
    isErasing = false;
    releasePointer(previewCanvas, event);
    activePointerId = null;
    clearCanvas(previewCanvas, previewCtx);
    finalCtx.globalCompositeOperation = "source-over";
    options.onCommit();
  };

  const handleWindowBlur = (event: Event) => {
    if (!isErasing) return;
    if (event instanceof PointerEvent) {
      releasePointer(previewCanvas, event);
    }
    releasePointerById(previewCanvas, activePointerId);
    activePointerId = null;
    isErasing = false;
    clearCanvas(previewCanvas, previewCtx);
    finalCtx.globalCompositeOperation = "source-over";
    if (event.type !== "sketch-navigation-cancel") options.onCommit();
  };

  const cleanup = bindPointerTool({
    canvas: previewCanvas,
    root: previewCanvas.closest(".sketchpad-app"),
    penOnlyMode: options.penOnlyMode,
    handlers: {
      onStart: (event) => start(event),
      onMove: (event) => move(event),
      onEnd: (event) => end(event),
      onCancel: handleWindowBlur,
    },
  });

  return () => {
    releasePointerById(previewCanvas, activePointerId);
    activePointerId = null;
    finalCtx.globalCompositeOperation = "source-over";
    cleanup();
  };
}
