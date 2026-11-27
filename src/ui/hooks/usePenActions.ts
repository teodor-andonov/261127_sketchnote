import { useCallback, useEffect, useRef } from "react";
import { isPenBarrelButton, isPenEraser } from "../../utils/pointer";
import type { PenAction } from "../../settings/settings";
import type { CanvasRefs } from "../components/CanvasHost";
import type { ToolType } from "../sketchTypes";

type UsePenActionsOptions = {
  canvasRefs: CanvasRefs | null;
  penButtonAction: PenAction;
  eraserTipAction: PenAction;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  onUndo: () => void;
  onReset: () => void;
  onSave: () => void;
  isPaused: boolean;
};

export function usePenActions({
  canvasRefs,
  penButtonAction,
  eraserTipAction,
  activeTool,
  setActiveTool,
  onUndo,
  onReset,
  onSave,
  isPaused,
}: UsePenActionsOptions) {
  const blockedPenPointerIds = useRef<Set<number>>(new Set());
  const restoreToolRef = useRef<ToolType | null>(null);

  const clearRestoreTool = useCallback(() => {
    restoreToolRef.current = null;
  }, []);

  const handleEraserCommit = useCallback(() => {
    const restoreTool = restoreToolRef.current;
    if (!restoreTool || restoreTool === "rubber") return;
    restoreToolRef.current = null;
    setActiveTool(restoreTool);
  }, [setActiveTool]);

  const runPenAction = useCallback(
    (action: PenAction) => {
      if (action === "undo") {
        clearRestoreTool();
        onUndo();
        return;
      }
      if (action === "save") {
        clearRestoreTool();
        onSave();
        return;
      }
      if (action === "reset") {
        clearRestoreTool();
        onReset();
        return;
      }
      if (action === "erase") {
        if (activeTool !== "rubber") {
          restoreToolRef.current = activeTool;
          setActiveTool("rubber");
        }
      }
    },
    [activeTool, clearRestoreTool, onReset, onSave, onUndo, setActiveTool],
  );

  useEffect(() => {
    if (!canvasRefs) return;
    if (isPaused) return;
    const previewCanvas = canvasRefs.previewCanvas;
    const ownerWindow = previewCanvas.ownerDocument.defaultView ?? window;
    const blockedPointers = blockedPenPointerIds.current;
    const rootEl = previewCanvas.closest(".sketchpad-app");

    const isInRoot = (event: PointerEvent) => {
      if (!rootEl) return true;
      const target = event.target as Node | null;
      return !!target && rootEl.contains(target);
    };

    const isInsideCanvas = (event: PointerEvent) => {
      const rect = previewCanvas.getBoundingClientRect();
      return (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      );
    };

    const blockEvent = (event: PointerEvent) => {
      if (event.pointerId != null) {
        blockedPointers.add(event.pointerId);
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isInRoot(event)) return;
      // Floating panels overlap the canvas bounds but must not trigger pen actions.
      if (!event.composedPath().includes(previewCanvas)) return;
      if (!isInsideCanvas(event)) return;
      const isEraserTip = isPenEraser(event);
      const isPenButton = !isEraserTip && isPenBarrelButton(event);
      if (!isEraserTip && !isPenButton) return;
      const action = isEraserTip ? eraserTipAction : penButtonAction;
      if (action === "erase" && activeTool === "rubber") return;
      runPenAction(action);
      blockEvent(event);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId == null || !blockedPointers.has(event.pointerId)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId == null || !blockedPointers.has(event.pointerId)) return;
      blockedPointers.delete(event.pointerId);
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    ownerWindow.addEventListener("pointerdown", handlePointerDown, true);
    ownerWindow.addEventListener("pointermove", handlePointerMove, true);
    ownerWindow.addEventListener("pointerup", handlePointerUp, true);
    ownerWindow.addEventListener("pointercancel", handlePointerUp, true);
    ownerWindow.addEventListener("lostpointercapture", handlePointerUp, true);

    return () => {
      ownerWindow.removeEventListener("pointerdown", handlePointerDown, true);
      ownerWindow.removeEventListener("pointermove", handlePointerMove, true);
      ownerWindow.removeEventListener("pointerup", handlePointerUp, true);
      ownerWindow.removeEventListener("pointercancel", handlePointerUp, true);
      ownerWindow.removeEventListener("lostpointercapture", handlePointerUp, true);
      blockedPointers.clear();
    };
  }, [
    canvasRefs,
    isPaused,
    activeTool,
    eraserTipAction,
    penButtonAction,
    runPenAction,
  ]);

  return { clearRestoreTool, handleEraserCommit };
}
