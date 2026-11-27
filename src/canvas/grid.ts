import { clearCanvas } from "../utils/canvas";

export type GridMode = "none" | "grid" | "dots" | "hlines";

export function drawGrid(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  mode: GridMode,
  lineThickness: number,
  dotMultiplier: number,
  gridColor: string,
) {
  clearCanvas(canvas, ctx);
  if (mode === "none") return;

  const gap = Math.max(4, gridSize);
  const strokeWidth = Math.max(0.5, lineThickness || 1);
  const dotDiameter = Math.max(1, strokeWidth * (dotMultiplier || 2));
  const dotRadius = dotDiameter / 2;

  ctx.strokeStyle = gridColor || "hsla(0, 0%, 50%, 0.05)";
  ctx.fillStyle = gridColor || "hsla(0, 0%, 50%, 0.05)";
  ctx.lineWidth = strokeWidth;

  if (mode === "dots") {
    for (let y = gap; y < height; y += gap) {
      for (let x = gap; x < width; x += gap) {
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    return;
  }

  if (mode === "hlines") {
    for (let y = gap; y < height; y += gap) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    return;
  }

  for (let x = gap; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = gap; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}
