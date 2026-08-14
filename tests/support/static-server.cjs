const http = require("http");
const fs = require("fs");
const path = require("path");

// tests/support/ -> repo root, which is what the app is served from.
const rootDir = path.resolve(__dirname, "..", "..");
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
};

function safeResolve(requestPath) {
  const normalizedPath = decodeURIComponent(String(requestPath || "/").split("?")[0]);
  const relativePath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const resolvedPath = path.resolve(rootDir, `.${relativePath}`);

  if (!resolvedPath.startsWith(rootDir)) {
    return null;
  }

  return resolvedPath;
}

const server = http.createServer((request, response) => {
  const resolvedPath = safeResolve(request.url);
  if (!resolvedPath) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(resolvedPath, (statError, stats) => {
    if (statError) {
      response.writeHead(404);
      response.end("Not Found");
      return;
    }

    const filePath = stats.isDirectory()
      ? path.join(resolvedPath, "index.html")
      : resolvedPath;

    fs.stat(filePath, (fileStatError, fileStats) => {
      if (fileStatError) {
        response.writeHead(404);
        response.end("Not Found");
        return;
      }

      const extension = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[extension] || "application/octet-stream";
      const totalSize = fileStats.size;

      // Byte-range support. Without it Chromium treats every media file as
      // non-seekable — it silently ignores a `currentTime` assignment and keeps
      // playing from where it was — which makes it impossible to test anything
      // that depends on reaching a point in a track. Real static hosts serve
      // ranges, so this makes the test server behave like the thing it stands
      // in for rather than adding a convenience the app would not otherwise
      // have.
      const rangeHeader = request.headers.range;
      const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader || "").trim());

      if (rangeMatch) {
        const [, rawStart, rawEnd] = rangeMatch;

        // "bytes=-500" means the last 500 bytes; "bytes=500-" means from 500 on.
        let start = rawStart === "" ? totalSize - Number(rawEnd) : Number(rawStart);
        let end = rawStart === "" || rawEnd === "" ? totalSize - 1 : Number(rawEnd);

        start = Math.max(0, start);
        end = Math.min(totalSize - 1, end);

        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
          response.writeHead(416, {
            "Content-Range": `bytes */${totalSize}`,
            "Cache-Control": "no-store",
          });
          response.end();
          return;
        }

        response.writeHead(206, {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": end - start + 1,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        });
        fs.createReadStream(filePath, { start, end }).pipe(response);
        return;
      }

      response.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": totalSize,
        // Advertised on every response, which is how the browser knows it may
        // ask for a range at all.
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath).pipe(response);
    });
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Static server listening on http://127.0.0.1:${port}\n`);
});