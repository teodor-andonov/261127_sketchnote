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

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distanceSquared = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export type DrawByHandOptions = {
  lineWidth: number;
  color: string;
  opacity: number;
  pressureEnabled: boolean;
  pressureFactor: number;
  penOnlyMode: boolean;
  onCommit: () => void;
  onDebugEvent?: (type: "start" | "move" | "end") => void;
};

export function drawByHand(
  previewCanvas: HTMLCanvasElement,
  finalCanvas: HTMLCanvasElement,
  options: DrawByHandOptions,
) {
  const previewCtx = getCanvasContext(previewCanvas);
  const finalCtx = getCanvasContext(finalCanvas, { willReadFrequently: true });
  if (!previewCtx || !finalCtx) return () => {};

  let isDrawing = false;
  const minDistance = Math.max(0.5, options.lineWidth / 6);
  let lastPoint: { x: number; y: number; pressure: number | null } | null = null;
  let points: Array<{ x: number; y: number; pressure: number | null }> = [];
  let activePointerId: number | null = null;

  const resolveStrokeWidth = (pressureValue: number | null) => {
    if (!options.pressureEnabled) return options.lineWidth;
    if (!Number.isFinite(pressureValue)) return options.lineWidth;
    const factor = clamp(options.pressureFactor, 0, 1);
    const clamped = clamp(pressureValue ?? 0, 0, 1);
    return options.lineWidth * (1 - factor) + 2 * options.lineWidth * factor * clamped;
  };

  const applyPreviewOpacity = (value: number) => {
    previewCanvas.style.opacity = String(value);
  };

  const resetStroke = () => {
    isDrawing = false;
    applyPreviewOpacity(1);
    points = [];
    lastPoint = null;
  };

  const collectEventPoints = (event: PointerEvent) => {
    const coalesced =
      typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : null;
    const events = coalesced && coalesced.length ? coalesced : [event];
    return events.map((evt) => {
      const pos = getPointerPosition(previewCanvas, evt);
      const pressureValue =
        evt.pointerType === "pen" && Number.isFinite(evt.pressure) ? evt.pressure : null;
      return { ...pos, pressure: pressureValue };
    });
  };

  const recordPoint = (point: { x: number; y: number; pressure: number | null }) => {
    if (!lastPoint) {
      points.push(point);
      lastPoint = point;
      return;
    }
    if (distanceSquared(point, lastPoint) < minDistance * minDistance) return;
    points.push(point);
    lastPoint = point;
  };

  const renderStrokePreview = () => {
    clearCanvas(previewCanvas, previewCtx);
    if (!points.length) return;
    const usePressure =
      options.pressureEnabled && points.some((point) => Number.isFinite(point.pressure));
    previewCtx.globalAlpha = 1;
    previewCtx.strokeStyle = options.color;
    previewCtx.fillStyle = options.color;
    previewCtx.lineCap = "round";
    previewCtx.lineJoin = "round";
    previewCtx.miterLimit = 1;

    if (points.length === 1) {
      const p = points[0];
      if (!p) return;
      const dotWidth = resolveStrokeWidth(p.pressure);
      previewCtx.lineWidth = dotWidth;
      previewCtx.beginPath();
      previewCtx.ellipse(p.x, p.y, dotWidth / 2, dotWidth / 2, 0, 0, 2 * Math.PI);
      previewCtx.fill();
      return;
    }

    if (!usePressure) {
      const first = points[0];
      if (!first) return;
      previewCtx.lineWidth = options.lineWidth;
      previewCtx.beginPath();
      previewCtx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        if (!prev || !curr) continue;
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        previewCtx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      const last = points[points.length - 1];
      if (!last) return;
      previewCtx.lineTo(last.x, last.y);
      previewCtx.stroke();
      return;
    }

    const first = points[0];
    if (!first) return;
    let lastMid = { x: first.x, y: first.y };
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (!prev || !curr) continue;
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      const prevPressure = prev.pressure ?? null;
      const currPressure = curr.pressure ?? null;
      const hasBoth =
        typeof prevPressure === "number" &&
        typeof currPressure === "number" &&
        Number.isFinite(prevPressure) &&
        Number.isFinite(currPressure);
      const pressureValue = hasBoth
        ? (prevPressure + currPressure) / 2
        : prevPressure ?? currPressure;
      previewCtx.lineWidth = resolveStrokeWidth(pressureValue);
      previewCtx.beginPath();
      previewCtx.moveTo(lastMid.x, lastMid.y);
      previewCtx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      previewCtx.stroke();
      lastMid = { x: midX, y: midY };
    }
    const last = points[points.length - 1];
    if (!last) return;
    previewCtx.lineWidth = resolveStrokeWidth(last.pressure);
    previewCtx.beginPath();
    previewCtx.moveTo(lastMid.x, lastMid.y);
    previewCtx.lineTo(last.x, last.y);
    previewCtx.stroke();
  };

  const beginStroke = (event: PointerEvent) => {
    isDrawing = true;
    applyPreviewOpacity(options.opacity < 1 ? options.opacity : 1);
    points = [];
    lastPoint = null;
    const eventPoints = collectEventPoints(event);
    eventPoints.forEach((point) => recordPoint(point));
    clearCanvas(previewCanvas, previewCtx);
    renderStrokePreview();
    setPointerCapture(previewCanvas, event);
    activePointerId = event.pointerId ?? null;
    options.onDebugEvent?.("start");
  };

  const start = (event: PointerEvent) => {
    if (isDrawing) return;
    if (!shouldHandlePointer(event, options.penOnlyMode)) return;
    const penLike = isPenLike(event);
    if (!isPrimaryAction(event, penLike)) return;
    event.preventDefault();
    beginStroke(event);
  };

  const move = (event: PointerEvent) => {
    if (!shouldHandlePointer(event, options.penOnlyMode)) return;
    if (isDrawing && activePointerId != null && event.pointerId !== activePointerId) return;
    const penLike = isPenLike(event);
    if (!penLike && event.isPrimary === false) return;
    const hasInput = penLike ? event.pressure > 0 || (event.buttons & 1) === 1 : (event.buttons & 1) === 1;
    if (!isDrawing && hasInput && isPrimaryAction(event, penLike)) {
      event.preventDefault();
      beginStroke(event);
    }
    if (!isDrawing) return;
    event.preventDefault();
    const eventPoints = collectEventPoints(event);
    for (const point of eventPoints) {
      recordPoint(point);
    }
    options.onDebugEvent?.("move");
    renderStrokePreview();
  };

  const end = (event: PointerEvent) => {
    if (!isDrawing) return;
    event.preventDefault();
    isDrawing = false;
    releasePointer(previewCanvas, event);
    activePointerId = null;
    finalCtx.save();
    finalCtx.globalAlpha = options.opacity;
    finalCtx.drawImage(previewCanvas, 0, 0);
    finalCtx.restore();
    clearCanvas(previewCanvas, previewCtx);
    options.onCommit();
    resetStroke();
    options.onDebugEvent?.("end");
  };

  const handleWindowBlur = (event: Event) => {
    if (!isDrawing) return;
    if (event instanceof PointerEvent) {
      releasePointer(previewCanvas, event);
    }
    releasePointerById(previewCanvas, activePointerId);
    activePointerId = null;
    resetStroke();
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
