export function getPointerPosition(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

export function setPointerCapture(
  target: Element,
  event: PointerEvent,
) {
  if (event.pointerId == null) return;
  if ("setPointerCapture" in target && typeof target.setPointerCapture === "function") {
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }
}

export function releasePointer(
  target: Element,
  event: PointerEvent,
) {
  if (event.pointerId == null) return;
  if ("releasePointerCapture" in target && typeof target.releasePointerCapture === "function") {
    try {
      target.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }
}

export function releasePointerById(target: Element, pointerId: number | null) {
  if (pointerId == null) return;
  if ("releasePointerCapture" in target && typeof target.releasePointerCapture === "function") {
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      // no-op
    }
  }
}

export function isPenLike(event: PointerEvent): boolean {
  if (event.pointerType === "pen") return true;
  if (event.pointerType === "" || event.pointerType == null) {
    return Number.isFinite(event.pressure) && event.pressure > 0;
  }
  return false;
}

export function isPenBarrelButton(event: PointerEvent): boolean {
  if (event.pointerType !== "pen") return false;
  if ((event.buttons & 2) === 2) return true;
  return event.button === 2;
}

export function isPenEraser(event: PointerEvent): boolean {
  if (event.pointerType !== "pen") return false;
  if ((event.buttons & 32) === 32) return true;
  return event.button === 5;
}

export function shouldHandlePointer(
  event: PointerEvent,
  penOnlyMode: boolean,
): boolean {
  if (!penOnlyMode) return true;
  return isPenLike(event);
}

export function isPrimaryAction(
  event: PointerEvent,
  penLike: boolean,
): boolean {
  if (penLike) {
    if (event.type === "pointerdown") return true;
    return event.pressure > 0 || (event.buttons & 1) === 1;
  }
  if (event.isPrimary === false) return false;
  if (event.button != null && event.button !== 0) return false;
  return true;
}
