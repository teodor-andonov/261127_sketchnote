import { useCallback, useEffect, useRef, useState } from "react";
import {
  drawPastePreview,
  getPasteHandleSizeCanvas,
  hitTestPaste,
  PasteState,
} from "../../canvas/paste";
import { getCanvasContext, clearCanvas } from "../../utils/canvas";
import {
  getPointerPosition,
  isPenLike,
  isPrimaryAction,
  releasePointer,
  releasePointerById,
  setPointerCapture,
} from "../../utils/pointer";
import type { CanvasRefs } from "../components/CanvasHost";

type UsePasteControllerOptions = {
  canvasRefs: CanvasRefs | null;
  canvasSize: { width: number; height: number };
  isPaused: boolean;
  onCommit: () => void;
};

export function usePasteController({
  canvasRefs,
  canvasSize,
  isPaused,
  onCommit,
}: UsePasteControllerOptions) {
  const [pasteState, setPasteState] = useState<PasteState | null>(null);
  const pasteStateRef = useRef<PasteState | null>(null);

  type DragState = {
    mode: "move" | "resize";
    pointerId: number | null;
    offsetX: number;
    offsetY: number;
    anchorX: number;
    anchorY: number;
    startWidth: number;
    startHeight: number;
  };

  const dragRef = useRef<DragState | null>(null);

  const clearPreviewCanvas = useCallback(() => {
    if (!canvasRefs) return;
    const previewCtx = getCanvasContext(canvasRefs.previewCanvas);
    if (!previewCtx) return;
    clearCanvas(canvasRefs.previewCanvas, previewCtx);
  }, [canvasRefs]);

  useEffect(() => {
    pasteStateRef.current = pasteState;
  }, [pasteState]);

  useEffect(() => {
    if (!canvasRefs) return;
    if (isPaused) {
      clearPreviewCanvas();
      return;
    }
    if (!pasteState) {
      clearPreviewCanvas();
      return;
    }
    const previewCtx = getCanvasContext(canvasRefs.previewCanvas);
    if (!previewCtx) return;
    drawPastePreview(canvasRefs.previewCanvas, previewCtx, pasteState);
  }, [canvasRefs, pasteState, clearPreviewCanvas, isPaused]);

  const stopDrag = useCallback((canvas: HTMLCanvasElement | null) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (canvas && drag.pointerId != null) {
      releasePointerById(canvas, drag.pointerId);
    }
  }, []);

  const clampPosition = useCallback(
    (x: number, y: number, width: number, height: number) => {
      const minX = Math.min(0, canvasSize.width - width);
      const maxX = Math.max(0, canvasSize.width - width);
      const minY = Math.min(0, canvasSize.height - height);
      const maxY = Math.max(0, canvasSize.height - height);
      return {
        x: Math.min(maxX, Math.max(minX, x)),
        y: Math.min(maxY, Math.max(minY, y)),
      };
    },
    [canvasSize.height, canvasSize.width],
  );

  const commitPaste = useCallback(() => {
    if (!canvasRefs) return;
    const current = pasteStateRef.current;
    if (!current) return;
    const finalCtx = getCanvasContext(canvasRefs.finalCanvas, {
      willReadFrequently: true,
    });
    if (!finalCtx) return;
    finalCtx.drawImage(
      current.image,
      current.x,
      current.y,
      current.width,
      current.height,
    );
    stopDrag(canvasRefs.previewCanvas);
    clearPreviewCanvas();
    setPasteState(null);
    onCommit();
  }, [canvasRefs, clearPreviewCanvas, onCommit, stopDrag]);

  const cancelPaste = useCallback(() => {
    stopDrag(canvasRefs?.previewCanvas ?? null);
    clearPreviewCanvas();
    setPasteState(null);
  }, [canvasRefs, clearPreviewCanvas, stopDrag]);

  const startPasteFromImage = useCallback(
    (image: HTMLImageElement | ImageBitmap) => {
      const maxWidth = canvasSize.width;
      const maxHeight = canvasSize.height;
      const width =
        "naturalWidth" in image ? image.naturalWidth || image.width : image.width;
      const height =
        "naturalHeight" in image ? image.naturalHeight || image.height : image.height;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      const nextWidth = Math.max(1, Math.round(width * scale));
      const nextHeight = Math.max(1, Math.round(height * scale));
      const x = (maxWidth - nextWidth) / 2;
      const y = (maxHeight - nextHeight) / 2;
      setPasteState({
        image,
        x,
        y,
        width: nextWidth,
        height: nextHeight,
      });
    },
    [canvasSize],
  );

  useEffect(() => {
    if (!canvasRefs) return;
    if (isPaused) return;
    const previewCanvas = canvasRefs.previewCanvas;
    const ownerWindow = previewCanvas.ownerDocument.defaultView ?? window;

    const handlePointerDown = (event: PointerEvent) => {
      const current = pasteStateRef.current;
      if (!current) return;
      if (!isPrimaryAction(event, isPenLike(event))) return;
      const pos = getPointerPosition(previewCanvas, event);
      const handleSize = getPasteHandleSizeCanvas(previewCanvas);
      const hit = hitTestPaste(current, pos, handleSize);
      if (!hit) return;
      dragRef.current = {
        mode: hit,
        pointerId: event.pointerId ?? null,
        offsetX: pos.x - current.x,
        offsetY: pos.y - current.y,
        anchorX: current.x,
        anchorY: current.y,
        startWidth: current.width,
        startHeight: current.height,
      };
      setPointerCapture(previewCanvas, event);
      event.preventDefault();
    };

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.pointerId != null && event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      const pos = getPointerPosition(previewCanvas, event);
      if (drag.mode === "resize") {
        const minScale = 0.1;
        const dx = Math.max(1, pos.x - drag.anchorX);
        const dy = Math.max(1, pos.y - drag.anchorY);
        const scale = Math.max(
          minScale,
          Math.max(dx / drag.startWidth, dy / drag.startHeight),
        );
        const nextWidth = Math.max(1, drag.startWidth * scale);
        const nextHeight = Math.max(1, drag.startHeight * scale);
        setPasteState((prev) =>
          prev
            ? {
                ...prev,
                width: nextWidth,
                height: nextHeight,
              }
            : prev,
        );
      } else {
        const nextX = pos.x - drag.offsetX;
        const nextY = pos.y - drag.offsetY;
        const clamped = clampPosition(
          nextX,
          nextY,
          drag.startWidth,
          drag.startHeight,
        );
        setPasteState((prev) =>
          prev
            ? {
                ...prev,
                x: clamped.x,
                y: clamped.y,
              }
            : prev,
        );
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!dragRef.current) return;
      stopDrag(previewCanvas);
      releasePointer(previewCanvas, event);
    };

    const handleLostCapture = () => {
      if (!dragRef.current) return;
      stopDrag(previewCanvas);
    };

    const handleDoubleClick = (event: PointerEvent) => {
      event.preventDefault();
      commitPaste();
    };

    previewCanvas.addEventListener("pointerdown", handlePointerDown, true);
    previewCanvas.addEventListener("pointermove", handlePointerMove, true);
    previewCanvas.addEventListener("pointerup", handlePointerUp, true);
    previewCanvas.addEventListener("pointercancel", handlePointerUp, true);
    previewCanvas.addEventListener("lostpointercapture", handleLostCapture, true);
    previewCanvas.addEventListener("dblclick", handleDoubleClick, true);
    ownerWindow.addEventListener("pointermove", handlePointerMove, true);
    ownerWindow.addEventListener("pointerup", handlePointerUp, true);
    ownerWindow.addEventListener("pointercancel", handlePointerUp, true);
    ownerWindow.addEventListener("blur", handleLostCapture, true);

    return () => {
      stopDrag(previewCanvas);
      previewCanvas.removeEventListener("pointerdown", handlePointerDown, true);
      previewCanvas.removeEventListener("pointermove", handlePointerMove, true);
      previewCanvas.removeEventListener("pointerup", handlePointerUp, true);
      previewCanvas.removeEventListener("pointercancel", handlePointerUp, true);
      previewCanvas.removeEventListener("lostpointercapture", handleLostCapture, true);
      previewCanvas.removeEventListener("dblclick", handleDoubleClick, true);
      ownerWindow.removeEventListener("pointermove", handlePointerMove, true);
      ownerWindow.removeEventListener("pointerup", handlePointerUp, true);
      ownerWindow.removeEventListener("pointercancel", handlePointerUp, true);
      ownerWindow.removeEventListener("blur", handleLostCapture, true);
    };
  }, [canvasRefs, clampPosition, commitPaste, isPaused, stopDrag]);

  return {
    pasteState,
    startPasteFromImage,
    commitPaste,
    cancelPaste,
  };
}
