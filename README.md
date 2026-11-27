# Sketchnote

A local-first, browser-only sketching and raster image annotation application.

- Open, draw on and save WebP, PNG and JPEG files. WebP uses lossless encoding in a worker.
- Pen, line, rectangle, ellipse, eraser, pressure, grids, zoom, paste with placement preview.
- Undo/redo stores changed tiles with a 64 MiB history budget (plus the current snapshot).
- Installable offline PWA; desktop Chromium supports file associations and direct file/folder access. Other browsers use import/download.
- Files are never uploaded. Settings only are stored locally. JPEG autosave is disabled.

## Development

npm install
npm test
npm run dev
npm run build
npm run preview

GitHub Pages deploys automatically from main through Actions. Install the PWA from the browser to register supported image file types; the OS/browser may request permission.

## License

MIT. Third-party dependencies retain their own licenses.

## Navigation

- Mouse wheel / trackpad scroll: zoom at cursor.
- Middle mouse or Space + left drag: pan; drag outside the image also pans.
- Touch: two-finger pinch/pan; single finger draws unless pen-only is enabled, in which case it pans.
- D: pen; L: line; R: rectangle; O: ellipse; E: eraser.
- Grid and zoom icon buttons cycle through presets. The footer shows live zoom percentage.
