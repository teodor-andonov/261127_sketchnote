type SketchnoteImageFormat = "webp" | "png" | "jpeg";

export const PEN_ACTIONS = ["undo", "erase", "save", "reset"] as const;
export type PenAction = (typeof PEN_ACTIONS)[number];

export interface SketchnoteSettings {
  defaultNamingFormat: string;
  defaultSaveFolder: string;
  defaultImageFormat: SketchnoteImageFormat;
  openAssociatedFormatByDefault: boolean;
  defaultBackgroundMode: "transparent" | "color";
  defaultBackgroundColor: string;
  autosaveEnabled: boolean;
  autosaveDelaySeconds: number;
  overlayHsla: string;
  defaultZoomMode: "actual" | "fit" | "fill";
  defaultCanvasWidth: number;
  defaultCanvasHeight: number;
  defaultGridMode: "none" | "grid" | "dots" | "hlines";
  defaultLineWidth: number;
  defaultOpacity: number;
  defaultColor: string;
  maxHistorySteps: number;
  gridSize: number;
  gridLineThickness: number;
  gridDotMultiplier: number;
  gridColorHsla: string;
  darkModeDisplay: "off" | "light" | "invert";
  pressureEnabled: boolean;
  pressureFactor: number;
  cursorDotDiameter: number;
  cursorColorHsla: string;
  penOnlyMode: boolean;
  penButtonAction: PenAction;
  eraserTipAction: PenAction;
  eraserWidthMultiplier: number;
  eraserPreviewEnabled: boolean;
  colorList: string;
  thicknessList: string;
  opacityList: string;
  lastSavedPath: string;
}

export const DEFAULT_SETTINGS: SketchnoteSettings = {
  defaultNamingFormat: "sketch_YYMMDDHHmmss",
  defaultSaveFolder: "",
  defaultImageFormat: "webp",
  openAssociatedFormatByDefault: false,
  defaultBackgroundMode: "transparent",
  defaultBackgroundColor: "hsl(0 0% 100%)",
  autosaveEnabled: true,
  autosaveDelaySeconds: 5,
  overlayHsla: "hsla(210, 15%, 96%, 0.08)",
  defaultZoomMode: "actual",
  defaultCanvasWidth: 1200,
  defaultCanvasHeight: 800,
  defaultGridMode: "none",
  defaultLineWidth: 2,
  defaultOpacity: 1,
  defaultColor: "hsl(0 0% 0%)",
  maxHistorySteps: 50,
  gridSize: 50,
  gridLineThickness: 1,
  gridDotMultiplier: 2,
  gridColorHsla: "hsla(0, 0%, 50%, 0.05)",
  darkModeDisplay: "invert",
  pressureEnabled: false,
  pressureFactor: 0.5,
  cursorDotDiameter: 2,
  cursorColorHsla: "hsla(0, 0%, 50%, 0.5)",
  penOnlyMode: true,
  penButtonAction: "undo",
  eraserTipAction: "erase",
  eraserWidthMultiplier: 1,
  eraserPreviewEnabled: true,
  colorList:
    "0 0% 0%; 240 25% 50%; 120 25% 50%; 0 25% 50%; 180 25% 50%; 60 25% 50%; 300 25% 50%",
  thicknessList: "1, 2, 3, 4, 5",
  opacityList: "25%, 50%, 75%, 100%",
  lastSavedPath: "",
};

export type LegacySettings = Partial<SketchnoteSettings> & {
  defaultPressureEnabled?: boolean;
  overlayHsl?: string;
  overlayOpacity?: number;
  cursorDotRadius?: number;
};
