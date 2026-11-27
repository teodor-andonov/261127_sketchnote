import React, { useEffect, useState } from "react";
import { drawGrid, GridMode } from "../../canvas/grid";

export type CanvasRefs = {
  previewCanvas: HTMLCanvasElement;
  finalCanvas: HTMLCanvasElement;
  gridCanvas: HTMLCanvasElement;
  scrollEl: HTMLDivElement;
};

export type CanvasHostProps = {
  width: number;
  height: number;
  zoomMode: "actual" | "fit" | "fill";
  gridMode: GridMode;
  gridSize: number;
  gridLineThickness: number;
  gridDotMultiplier: number;
  gridColor: string;
  overlayColor?: string;
  onReady: (refs: CanvasRefs | null) => void;
};

export function CanvasHost({
  width,
  height,
  zoomMode,
  gridMode,
  gridSize,
  gridLineThickness,
  gridDotMultiplier,
  gridColor,
  overlayColor,
  onReady,
}: CanvasHostProps) {
  const [previewEl, setPreviewEl] = useState<HTMLCanvasElement | null>(null);
  const [finalEl, setFinalEl] = useState<HTMLCanvasElement | null>(null);
  const [gridEl, setGridEl] = useState<HTMLCanvasElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [viewSize, setViewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!previewEl || !finalEl || !gridEl || !scrollEl) {
      onReady(null);
      return;
    }
    onReady({
      previewCanvas: previewEl,
      finalCanvas: finalEl,
      gridCanvas: gridEl,
      scrollEl,
    });
    return () => onReady(null);
  }, [previewEl, finalEl, gridEl, scrollEl, onReady]);

  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const update = () => {
      setViewSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const ownerWindow = el.ownerDocument.defaultView ?? window;
    const cleanupFns: Array<() => void> = [];

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(update);
      observer.observe(el);
      cleanupFns.push(() => observer.disconnect());
    }

    ownerWindow.addEventListener("resize", update);
    ownerWindow.addEventListener("fullscreenchange", update);
    cleanupFns.push(() => ownerWindow.removeEventListener("resize", update));
    cleanupFns.push(() => ownerWindow.removeEventListener("fullscreenchange", update));

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, [scrollEl]);

  useEffect(() => {
    const gridCanvas = gridEl;
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;
    drawGrid(
      gridCanvas,
      ctx,
      width,
      height,
      gridSize,
      gridMode,
      gridLineThickness,
      gridDotMultiplier,
      gridColor,
    );
  }, [gridEl, width, height, gridMode, gridSize, gridLineThickness, gridDotMultiplier, gridColor]);

  let scale = 1;
  if (zoomMode !== "actual" && viewSize.width > 0 && viewSize.height > 0) {
    const scaleX = viewSize.width / width;
    const scaleY = viewSize.height / height;
    scale = zoomMode === "fit" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;
  }

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  return (
    <div className="sketchpad-canvas-host">
      <div className="sketchpad-canvas-scroll" ref={setScrollEl}>
        <div
          className="sketchpad-canvas-scale"
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            minWidth: `${viewSize.width}px`,
            minHeight: `${viewSize.height}px`,
          }}
        >
          <div
            className="sketchpad-canvas-layer"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <canvas
              ref={setFinalEl}
              width={width}
              height={height}
              className="sketchpad-canvas-final"
              style={{ background: overlayColor || "transparent" }}
            />
            {gridMode !== "none" ? (
              <canvas ref={setGridEl} width={width} height={height} className="sketchpad-canvas-grid" />
            ) : (
              <canvas
                ref={setGridEl}
                width={width}
                height={height}
                className="sketchpad-canvas-grid"
                style={{ display: "none" }}
              />
            )}
            <canvas
              ref={setPreviewEl}
              width={width}
              height={height}
              className="sketchpad-canvas-preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
