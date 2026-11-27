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

export type DrawLineOptions = {
  lineWidth: number;
  color: string;
  opacity: number;
  penOnlyMode: boolean;
  onCommit: () => void;
  onDebugEvent?: (type: "start" | "move" | "end") => void;
};

export function drawLine(
  previewCanvas: HTMLCanvasElement,
  finalCanvas: HTMLCanvasElement,
  options: DrawLineOptions,
) {
  const previewCtx = getCanvasContext(previewCanvas);
  const finalCtx = getCanvasContext(finalCanvas, { willReadFrequently: true });
  if (!previewCtx || !finalCtx) return () => {};

  let isDrawing = false;
  let startPoint: { x: number; y: number } | null = null;
  let activePointerId: number | null = null;

  const drawPreview = (point: { x: number; y: number }) => {
    if (!startPoint) return;
    clearCanvas(previewCanvas, previewCtx);
    previewCtx.save();
    previewCtx.lineWidth = options.lineWidth;
    previewCtx.strokeStyle = options.color;
    previewCtx.globalAlpha = Math.min(0.7, options.opacity);
    previewCtx.setLineDash([8, 6]);
    previewCtx.beginPath();
    previewCtx.moveTo(startPoint.x, startPoint.y);
    previewCtx.lineTo(point.x, point.y);
    previewCtx.stroke();
    previewCtx.restore();
  };

  const begin = (event: PointerEvent) => {
    isDrawing = true;
    startPoint = getPointerPosition(previewCanvas, event);
    setPointerCapture(previewCanvas, event);
    activePointerId = event.pointerId ?? null;
    drawPreview(startPoint);
    options.onDebugEvent?.("start");
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
    const penLike = isPenLike(event);
    if (!penLike && event.isPrimary === false) return;
    const hasInput = penLike ? event.pressure > 0 || (event.buttons & 1) === 1 : (event.buttons & 1) === 1;
    if (!isDrawing && hasInput && isPrimaryAction(event, penLike)) {
      event.preventDefault();
      begin(event);
    }
    if (!isDrawing) return;
    event.preventDefault();
    const point = getPointerPosition(previewCanvas, event);
    drawPreview(point);
    options.onDebugEvent?.("move");
  };

  const end = (event: PointerEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    isDrawing = false;
    releasePointer(previewCanvas, event);
    activePointerId = null;
    if (startPoint) {
      const point = getPointerPosition(previewCanvas, event);
      clearCanvas(previewCanvas, previewCtx);
      finalCtx.save();
      finalCtx.lineWidth = options.lineWidth;
      finalCtx.strokeStyle = options.color;
      finalCtx.globalAlpha = options.opacity;
      finalCtx.beginPath();
      finalCtx.moveTo(startPoint.x, startPoint.y);
      finalCtx.lineTo(point.x, point.y);
      finalCtx.stroke();
      finalCtx.restore();
      options.onCommit();
    } else {
      clearCanvas(previewCanvas, previewCtx);
      options.onCommit();
    }
    options.onDebugEvent?.("end");
  };

  const handleWindowBlur = (event: Event) => {
    if (!isDrawing) return;
    if (event instanceof PointerEvent) {
      releasePointer(previewCanvas, event);
    }
    releasePointerById(previewCanvas, activePointerId);
    activePointerId = null;
    isDrawing = false;
    startPoint = null;
    clearCanvas(previewCanvas, previewCtx);
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
    cleanup();
  };
}
