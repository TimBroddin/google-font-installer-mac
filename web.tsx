import { fetchCatalog, installFont } from "./lib.ts";
import type { FontMeta } from "./lib.ts";
import index from "./web.html";

let catalog: FontMeta[] | null = null;

const server = Bun.serve({
  port: 3456,
  routes: {
    "/": index,
    "/api/catalog": {
      async GET() {
        if (!catalog) {
          catalog = await fetchCatalog();
        }
        return Response.json(catalog);
      },
    },
    "/api/install": {
      async POST(req) {
        const body = await req.json() as { family: string; variants?: string[] };
        if (!catalog) {
          catalog = await fetchCatalog();
        }
        const font = catalog.find((f) => f.family === body.family);
        if (!font) {
          return Response.json({ error: "Font not found" }, { status: 404 });
        }

        const toInstall: FontMeta = body.variants
          ? { ...font, variants: body.variants }
          : font;

        const logs: string[] = [];
        const result = await installFont(toInstall, (msg) => logs.push(msg));
        return Response.json({ result, logs });
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`Google Font Installer web UI running at http://localhost:${server.port}`);

// Auto-open browser on macOS
Bun.spawn(["open", `http://localhost:${server.port}`]);
