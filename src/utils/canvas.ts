export function clearCanvas(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function getCanvasContext(
  canvas: HTMLCanvasElement,
  opts?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D | null {
  return canvas.getContext("2d", opts);
}
