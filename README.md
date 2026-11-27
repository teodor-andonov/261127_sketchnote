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
