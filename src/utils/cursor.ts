export function getAccentColor(target: Element): string {
  const ownerWindow = target.ownerDocument.defaultView ?? window;
  const style = ownerWindow.getComputedStyle(target);
  const accent = style.getPropertyValue("--interactive-accent").trim();
  return accent || "rgba(127, 127, 127, 1)";
}

export function setCanvasCursor(
  canvas: HTMLCanvasElement,
  diameter: number,
  color: string,
) {
  const dotRadius = Math.max(1, Math.round(diameter / 2));
  const pad = 2;
  const size = dotRadius * 2 + pad * 2;
  const tmp = document.createElement("canvas");
  tmp.width = size;
  tmp.height = size;
  const ctx = tmp.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  ctx.beginPath();
  ctx.arc(pad + dotRadius, pad + dotRadius, dotRadius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  const dataUrl = tmp.toDataURL("image/png");
  canvas.style.cursor = `url(${dataUrl}) ${pad + dotRadius} ${pad + dotRadius}, crosshair`;
}
