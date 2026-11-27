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

export type DrawRectOptions = {
  lineWidth: number;
  color: string;
  opacity: number;
  fillEnabled: boolean;
  penOnlyMode: boolean;
  onCommit: () => void;
};

type Rect = { x: number; y: number; width: number; height: number };

function toRect(a: { x: number; y: number }, b: { x: number; y: number }): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) };
}

export function drawRect(
  previewCanvas: HTMLCanvasElement,
  finalCanvas: HTMLCanvasElement,
  options: DrawRectOptions,
) {
  const previewCtx = getCanvasContext(previewCanvas);
  const finalCtx = getCanvasContext(finalCanvas, { willReadFrequently: true });
  if (!previewCtx || !finalCtx) return () => {};

  let isDrawing = false;
  let startPoint: { x: number; y: number } | null = null;
  let activePointerId: number | null = null;

  const drawPreview = (rect: Rect) => {
    clearCanvas(previewCanvas, previewCtx);
    if (rect.width <= 0 || rect.height <= 0) return;
    previewCtx.save();
    if (options.fillEnabled) {
      previewCtx.globalAlpha = Math.min(0.3, options.opacity);
      previewCtx.fillStyle = options.color;
      previewCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else {
      previewCtx.lineWidth = options.lineWidth;
      previewCtx.strokeStyle = options.color;
      previewCtx.setLineDash([6, 6]);
      previewCtx.globalAlpha = options.opacity;
      previewCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
    previewCtx.restore();
  };

  const begin = (event: PointerEvent) => {
    isDrawing = true;
    startPoint = getPointerPosition(previewCanvas, event);
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
    const penLike = isPenLike(event);
    if (!penLike && event.isPrimary === false) return;
    const hasInput = penLike ? event.pressure > 0 || (event.buttons & 1) === 1 : (event.buttons & 1) === 1;
    if (!isDrawing && hasInput && isPrimaryAction(event, penLike)) {
      event.preventDefault();
      begin(event);
    }
    if (!isDrawing || !startPoint) return;
    event.preventDefault();
    drawPreview(toRect(startPoint, getPointerPosition(previewCanvas, event)));
  };

  const end = (event: PointerEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    isDrawing = false;
    releasePointer(previewCanvas, event);
    activePointerId = null;
    if (startPoint) {
      const rect = toRect(startPoint, getPointerPosition(previewCanvas, event));
      clearCanvas(previewCanvas, previewCtx);
      if (rect.width > 0 && rect.height > 0) {
        finalCtx.save();
        finalCtx.lineWidth = options.lineWidth;
        finalCtx.strokeStyle = options.color;
        finalCtx.globalAlpha = options.opacity;
        if (options.fillEnabled) {
          finalCtx.fillStyle = options.color;
          finalCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
        } else {
          finalCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        }
        finalCtx.restore();
      }
      options.onCommit();
    } else {
      clearCanvas(previewCanvas, previewCtx);
      options.onCommit();
    }
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
