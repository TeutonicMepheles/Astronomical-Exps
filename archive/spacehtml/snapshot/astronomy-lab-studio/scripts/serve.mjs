import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const requested = process.argv[2] || "dist";
const publicRoot = path.resolve(root, requested);
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://localhost");
    const decoded = decodeURIComponent(url.pathname);
    const relative = decoded.replace(/^\/+/, "");
    const candidates = [
      path.join(publicRoot, relative),
      path.join(publicRoot, relative, "index.html")
    ];

    let file;
    for (const candidate of candidates) {
      const resolved = path.resolve(candidate);
      if (!resolved.startsWith(publicRoot)) continue;
      try {
        const stat = await fs.stat(resolved);
        if (stat.isFile()) {
          file = resolved;
          break;
        }
      } catch {
        // Try the next candidate.
      }
    }

    if (!file) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const body = await fs.readFile(file);
    response.writeHead(200, {
      "content-type": mimeTypes[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end(String(error));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Astronomy Lab Studio: http://127.0.0.1:${port}`);
});
