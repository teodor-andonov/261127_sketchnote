import { useEffect } from "react";
import { drawByHand } from "../../canvas/tools/strokeFreehand";
import { drawLine } from "../../canvas/tools/strokeSegment";
import { drawRect } from "../../canvas/tools/shapeBox";
import { drawEllipse } from "../../canvas/tools/shapeOval";
import { eraser } from "../../canvas/tools/eraser";
import { clearCanvas, getCanvasContext } from "../../utils/canvas";
import type { CanvasRefs } from "../components/CanvasHost";
import type { ToolType } from "../sketchTypes";

type UseToolBindingsOptions = {
  canvasRefs: CanvasRefs | null;
  activeTool: ToolType;
  lineWidth: number;
  color: string;
  opacity: number;
  fillEnabled: boolean;
  penOnlyMode: boolean;
  pressureEnabled: boolean;
  pressureFactor: number;
  eraserWidthMultiplier: number;
  eraserPreviewEnabled: boolean;
  onCommit: () => void;
  onEraserCommit: () => void;
  rebindToken: number;
  isPaused: boolean;
};

export function useToolBindings({
  canvasRefs,
  activeTool,
  lineWidth,
  color,
  opacity,
  fillEnabled,
  penOnlyMode,
  pressureEnabled,
  pressureFactor,
  eraserWidthMultiplier,
  eraserPreviewEnabled,
  onCommit,
  onEraserCommit,
  rebindToken,
  isPaused,
}: UseToolBindingsOptions): void {
  useEffect(() => {
    if (!canvasRefs) return;
    if (isPaused) return;
    const previewCtx = getCanvasContext(canvasRefs.previewCanvas);
    if (previewCtx) clearCanvas(canvasRefs.previewCanvas, previewCtx);
    const common = {
      lineWidth,
      color,
      opacity,
      penOnlyMode,
      onCommit,
    };
    let cleanup = () => {};
    switch (activeTool) {
      case "pen":
        cleanup = drawByHand(canvasRefs.previewCanvas, canvasRefs.finalCanvas, {
          ...common,
          pressureEnabled,
          pressureFactor,
        });
        break;
      case "segment":
        cleanup = drawLine(canvasRefs.previewCanvas, canvasRefs.finalCanvas, common);
        break;
      case "box":
        cleanup = drawRect(canvasRefs.previewCanvas, canvasRefs.finalCanvas, {
          ...common,
          fillEnabled,
        });
        break;
      case "oval":
        cleanup = drawEllipse(canvasRefs.previewCanvas, canvasRefs.finalCanvas, {
          ...common,
          fillEnabled,
        });
        break;
      case "rubber": {
        const eraserSize = Math.max(1, lineWidth * eraserWidthMultiplier);
        cleanup = eraser(canvasRefs.previewCanvas, canvasRefs.finalCanvas, {
          size: eraserSize,
          penOnlyMode,
          previewEnabled: eraserPreviewEnabled,
          onCommit: onEraserCommit,
        });
        break;
      }
      default:
        break;
    }
    return () => cleanup();
  }, [
    canvasRefs,
    isPaused,
    activeTool,
    lineWidth,
    color,
    opacity,
    penOnlyMode,
    fillEnabled,
    pressureEnabled,
    pressureFactor,
    eraserWidthMultiplier,
    eraserPreviewEnabled,
    onCommit,
    onEraserCommit,
    rebindToken,
  ]);
}
