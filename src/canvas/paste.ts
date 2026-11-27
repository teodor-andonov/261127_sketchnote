import { clearCanvas } from "../utils/canvas";
import { getAccentColor } from "../utils/cursor";

export type PasteState = {
  image: HTMLImageElement | ImageBitmap;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const PASTE_HANDLE_SIZE = 32;
export const PASTE_HANDLE_SIZE_COARSE = 32;

export function getPasteHandleSize(ownerWindow: Window): number {
  if (ownerWindow.matchMedia?.("(pointer: coarse)").matches) {
    return PASTE_HANDLE_SIZE_COARSE;
  }
  return PASTE_HANDLE_SIZE;
}

function getCanvasScale(canvas: HTMLCanvasElement): number {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return 1;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const scale =
    Number.isFinite(scaleX) && Number.isFinite(scaleY)
      ? Math.max(scaleX, scaleY)
      : 1;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

export function getPasteHandleSizeCanvas(canvas: HTMLCanvasElement): number {
  const ownerWindow = canvas.ownerDocument.defaultView ?? window;
  const handleSize = getPasteHandleSize(ownerWindow);
  return handleSize * getCanvasScale(canvas);
}

let colorParserContext: CanvasRenderingContext2D | null = null;
let colorParserDoc: Document | null = null;

function getColorParserContext(
  doc: Document,
): CanvasRenderingContext2D | null {
  if (colorParserContext && colorParserDoc === doc) return colorParserContext;
  const parserCanvas = doc.createElement("canvas");
  const ctx = parserCanvas.getContext("2d");
  if (!ctx) return null;
  colorParserContext = ctx;
  colorParserDoc = doc;
  return ctx;
}

function invertCssColor(value: string, canvas: HTMLCanvasElement): string {
  const ctx = getColorParserContext(canvas.ownerDocument);
  if (!ctx) return value;
  ctx.fillStyle = value;
  const normalized = ctx.fillStyle;
  if (normalized.startsWith("#")) {
    const hex = normalized.slice(1);
    if (hex.length === 3 || hex.length === 6) {
      const step = hex.length === 3 ? 1 : 2;
      const read = (idx: number) => {
        const slice = hex.slice(idx, idx + step);
        const full = step === 1 ? `${slice}${slice}` : slice;
        const parsed = parseInt(full, 16);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const r = read(0);
      const g = read(step);
      const b = read(step * 2);
      const ir = Math.max(0, Math.min(255, 255 - r));
      const ig = Math.max(0, Math.min(255, 255 - g));
      const ib = Math.max(0, Math.min(255, 255 - b));
      return `rgba(${Math.round(ir)}, ${Math.round(ig)}, ${Math.round(ib)}, 1)`;
    }
    return value;
  }
  const match = normalized.match(/^rgba?\(([^)]+)\)$/);
  const channel = match?.[1];
  if (!channel) return value;
  const parts = channel.split(",").map((part) => part.trim());
  if (parts.length < 3) return value;
  const r = Number(parts[0] ?? "0");
  const g = Number(parts[1] ?? "0");
  const b = Number(parts[2] ?? "0");
  const a = parts.length >= 4 ? Number(parts[3] ?? "1") : 1;
  if (![r, g, b, a].every(Number.isFinite)) return value;
  const ir = Math.max(0, Math.min(255, 255 - r));
  const ig = Math.max(0, Math.min(255, 255 - g));
  const ib = Math.max(0, Math.min(255, 255 - b));
  const alpha = Math.max(0, Math.min(1, a));
  return `rgba(${Math.round(ir)}, ${Math.round(ig)}, ${Math.round(ib)}, ${alpha})`;
}

function resolvePasteAccentColor(canvas: HTMLCanvasElement): string {
  const accent = getAccentColor(canvas);
  const root = canvas.closest(".sketchpad-app");
  if (!root) return accent;
  if (root.getAttribute("data-dark-mode") !== "invert") return accent;
  return invertCssColor(accent, canvas);
}

export function drawPastePreview(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: PasteState,
) {
  clearCanvas(canvas, ctx);
  const borderWidth = 4 * getCanvasScale(canvas);
  const handleSize = getPasteHandleSizeCanvas(canvas);
  const accent = resolvePasteAccentColor(canvas);
  const handleRadius = handleSize / 2;
  const handleCx = state.x + state.width;
  const handleCy = state.y + state.height;
  ctx.save();
  ctx.drawImage(state.image, state.x, state.y, state.width, state.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(state.x, state.y, state.width, state.height);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(handleCx, handleCy, handleRadius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

export function hitTestPaste(
  state: PasteState,
  point: { x: number; y: number },
  handleSize: number = PASTE_HANDLE_SIZE,
): "resize" | "move" | null {
  const handleOffset = handleSize / 2;
  const handleX = state.x + state.width - handleOffset;
  const handleY = state.y + state.height - handleOffset;
  if (
    point.x >= handleX &&
    point.x <= handleX + handleSize &&
    point.y >= handleY &&
    point.y <= handleY + handleSize
  ) {
    return "resize";
  }
  if (
    point.x >= state.x &&
    point.x <= state.x + state.width &&
    point.y >= state.y &&
    point.y <= state.y + state.height
  ) {
    return "move";
  }
  return null;
}
